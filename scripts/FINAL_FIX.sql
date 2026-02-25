-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ДОСТУПА К ПАЦИЕНТАМ

-- Шаг 1: Удаляем foreign key constraint который мешает
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_doctor_id_fkey;

-- Шаг 2: Делаем doctor_id nullable временно
ALTER TABLE patients ALTER COLUMN doctor_id DROP NOT NULL;

-- Шаг 3: Получаем ID пользователя zhuma_md и обновляем пациентов
DO $$
DECLARE
    zhuma_user_id UUID;
BEGIN
    -- Находим ID пользователя по email
    SELECT id INTO zhuma_user_id 
    FROM auth.users 
    WHERE email = 'zhuma_md@example.com';
    
    IF zhuma_user_id IS NOT NULL THEN
        -- Обновляем ВСЕХ пациентов, привязываем к zhuma_md
        UPDATE patients 
        SET doctor_id = zhuma_user_id;
        
        RAISE NOTICE 'Все пациенты привязаны к zhuma_md (ID: %)', zhuma_user_id;
        
        -- Обновляем профиль
        UPDATE profiles
        SET 
            full_name = 'Жума Медицинский',
            credits = 1000,
            subscription_type = 'unlimited',
            is_active = true
        WHERE id = zhuma_user_id;
        
        RAISE NOTICE 'Профиль обновлен!';
    ELSE
        RAISE NOTICE 'ОШИБКА: Пользователь zhuma_md@example.com не найден!';
    END IF;
END $$;

-- Шаг 4: Создаем правильный foreign key constraint
ALTER TABLE patients 
ADD CONSTRAINT patients_doctor_id_fkey 
FOREIGN KEY (doctor_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Шаг 5: Проверяем результат
SELECT 
    COUNT(*) as total_patients,
    doctor_id
FROM patients
GROUP BY doctor_id;

-- Шаг 6: Показываем пациентов с именами врачей
SELECT 
    p.patient_name,
    p.diagnosis,
    p.visit_date,
    pr.email as doctor_email,
    pr.full_name as doctor_name
FROM patients p
LEFT JOIN profiles pr ON p.doctor_id = pr.id
ORDER BY p.created_at DESC
LIMIT 10;
