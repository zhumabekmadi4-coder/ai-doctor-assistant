-- =====================================================
-- SQL-скрипт для обновления структуры базы данных
-- Миграция на Supabase с поддержкой индивидуальных кредитов для врачей
-- =====================================================

-- 1. Обновление таблицы templates
-- Добавляем недостающие колонки для поддержки расширенной функциональности шаблонов
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS header_text TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS author_login TEXT,
ADD COLUMN IF NOT EXISTS author_name TEXT,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Обновляем существующие записи, если они есть
UPDATE templates 
SET 
    description = COALESCE(description, ''),
    header_text = COALESCE(header_text, title),
    is_public = COALESCE(is_public, false),
    author_login = COALESCE(author_login, 'system'),
    author_name = COALESCE(author_name, 'Система'),
    images = COALESCE(images, '[]'::jsonb),
    updated_at = COALESCE(updated_at, created_at)
WHERE description IS NULL OR header_text IS NULL;

-- Создаем индекс для быстрого поиска публичных шаблонов
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public);
CREATE INDEX IF NOT EXISTS idx_templates_author_login ON templates(author_login);

-- 2. Обновление таблицы profiles
-- Добавляем систему кредитов для индивидуальных врачей
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_credit_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Обновляем существующие профили - даем начальные кредиты
UPDATE profiles 
SET 
    credits = COALESCE(credits, 10),
    total_credits_used = COALESCE(total_credits_used, 0),
    last_credit_update = COALESCE(last_credit_update, NOW()),
    is_active = COALESCE(is_active, true),
    subscription_type = COALESCE(subscription_type, 'free')
WHERE credits IS NULL;

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_type ON profiles(subscription_type);

-- 3. Создание таблицы для истории использования кредитов
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('add', 'deduct', 'refund')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Индексы для таблицы транзакций
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);

-- 4. Создание таблицы для тарифных планов
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    credits_per_month INTEGER NOT NULL,
    price_monthly DECIMAL(10, 2),
    price_yearly DECIMAL(10, 2),
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем базовые тарифные планы
INSERT INTO subscription_plans (name, credits_per_month, price_monthly, price_yearly, features, is_active)
VALUES 
    ('free', 10, 0, 0, '{"max_patients": 5, "templates": true, "support": "community"}'::jsonb, true),
    ('basic', 100, 990, 9900, '{"max_patients": 50, "templates": true, "support": "email", "priority": false}'::jsonb, true),
    ('pro', 500, 2990, 29900, '{"max_patients": 200, "templates": true, "support": "priority", "priority": true, "analytics": true}'::jsonb, true),
    ('unlimited', 999999, 9990, 99900, '{"max_patients": -1, "templates": true, "support": "24/7", "priority": true, "analytics": true, "custom_features": true}'::jsonb, true)
ON CONFLICT (name) DO NOTHING;

-- 5. Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Функция для списания кредитов
CREATE OR REPLACE FUNCTION deduct_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT DEFAULT 'Использование AI ассистента'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_credits INTEGER;
BEGIN
    -- Получаем текущий баланс кредитов
    SELECT credits INTO v_current_credits
    FROM profiles
    WHERE id = p_user_id AND is_active = true
    FOR UPDATE;
    
    -- Проверяем, достаточно ли кредитов
    IF v_current_credits IS NULL THEN
        RAISE EXCEPTION 'Пользователь не найден или неактивен';
    END IF;
    
    IF v_current_credits < p_amount THEN
        RETURN false;
    END IF;
    
    -- Списываем кредиты
    UPDATE profiles
    SET 
        credits = credits - p_amount,
        total_credits_used = total_credits_used + p_amount,
        last_credit_update = NOW()
    WHERE id = p_user_id;
    
    -- Записываем транзакцию
    INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
    VALUES (p_user_id, -p_amount, 'deduct', p_description);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 7. Функция для добавления кредитов
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT DEFAULT 'Пополнение кредитов'
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Добавляем кредиты
    UPDATE profiles
    SET 
        credits = credits + p_amount,
        last_credit_update = NOW()
    WHERE id = p_user_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Пользователь не найден или неактивен';
    END IF;
    
    -- Записываем транзакцию
    INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
    VALUES (p_user_id, p_amount, 'add', p_description);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 8. Обновление таблицы patients
-- Добавляем поле для отслеживания использованных кредитов на пациента
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0;

-- 9. Row Level Security (RLS) политики
-- Включаем RLS для таблиц
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Политики для templates
DROP POLICY IF EXISTS "Пользователи могут видеть свои шаблоны" ON templates;
CREATE POLICY "Пользователи могут видеть свои шаблоны"
    ON templates FOR SELECT
    USING (
        author_login = auth.jwt() ->> 'email' 
        OR is_public = true
    );

DROP POLICY IF EXISTS "Пользователи могут создавать свои шаблоны" ON templates;
CREATE POLICY "Пользователи могут создавать свои шаблоны"
    ON templates FOR INSERT
    WITH CHECK (author_login = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "Пользователи могут обновлять свои шаблоны" ON templates;
CREATE POLICY "Пользователи могут обновлять свои шаблоны"
    ON templates FOR UPDATE
    USING (author_login = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "Пользователи могут удалять свои шаблоны" ON templates;
CREATE POLICY "Пользователи могут удалять свои шаблоны"
    ON templates FOR DELETE
    USING (author_login = auth.jwt() ->> 'email');

-- Политики для credit_transactions
DROP POLICY IF EXISTS "Пользователи могут видеть свои транзакции" ON credit_transactions;
CREATE POLICY "Пользователи могут видеть свои транзакции"
    ON credit_transactions FOR SELECT
    USING (user_id IN (
        SELECT id FROM profiles WHERE email = auth.jwt() ->> 'email'
    ));

-- Политики для subscription_plans (все могут читать)
DROP POLICY IF EXISTS "Все могут видеть тарифные планы" ON subscription_plans;
CREATE POLICY "Все могут видеть тарифные планы"
    ON subscription_plans FOR SELECT
    USING (is_active = true);

-- 10. Создание представления для статистики по кредитам
CREATE OR REPLACE VIEW user_credit_stats AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.credits as current_credits,
    p.total_credits_used,
    p.subscription_type,
    p.last_credit_update,
    COUNT(ct.id) as total_transactions,
    COALESCE(SUM(CASE WHEN ct.transaction_type = 'add' THEN ct.amount ELSE 0 END), 0) as total_added,
    COALESCE(SUM(CASE WHEN ct.transaction_type = 'deduct' THEN ABS(ct.amount) ELSE 0 END), 0) as total_deducted
FROM profiles p
LEFT JOIN credit_transactions ct ON p.id = ct.user_id
GROUP BY p.id, p.email, p.full_name, p.credits, p.total_credits_used, p.subscription_type, p.last_credit_update;

-- Комментарии к таблицам и колонкам для документации
COMMENT ON TABLE templates IS 'Таблица шаблонов рекомендаций для врачей';
COMMENT ON TABLE credit_transactions IS 'История транзакций кредитов пользователей';
COMMENT ON TABLE subscription_plans IS 'Тарифные планы подписок';
COMMENT ON COLUMN profiles.credits IS 'Текущий баланс кредитов пользователя';
COMMENT ON COLUMN profiles.total_credits_used IS 'Общее количество использованных кредитов';
COMMENT ON COLUMN profiles.subscription_type IS 'Тип подписки: free, basic, pro, unlimited';

-- Завершение
SELECT 'Структура базы данных успешно обновлена!' as status;
