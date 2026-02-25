-- Исправление доступа к пациентам для zhuma_md

-- 1. Получаем ID пользователя zhuma_md
DO $$
DECLARE
    zhuma_user_id UUID;
BEGIN
    -- Находим ID пользователя по email
    SELECT id INTO zhuma_user_id 
    FROM auth.users 
    WHERE email = 'zhuma_md@example.com';
    
    IF zhuma_user_id IS NULL THEN
        RAISE NOTICE 'Пользователь zhuma_md@example.com не найден!';
    ELSE
        RAISE NOTICE 'ID пользователя zhuma_md: %', zhuma_user_id;
        
        -- 2. Обновляем всех пациентов без doctor_id, привязываем к zhuma_md
        UPDATE patients 
        SET doctor_id = zhuma_user_id
        WHERE doctor_id IS NULL;
        
        RAISE NOTICE 'Пациенты обновлены!';
        
        -- 3. Обновляем профиль zhuma_md
        UPDATE profiles
        SET 
            full_name = 'Жума Медицинский',
            credits = 1000,
            subscription_type = 'unlimited',
            is_active = true
        WHERE id = zhuma_user_id;
        
        RAISE NOTICE 'Профиль обновлен!';
    END IF;
END $$;

-- 4. Проверяем результат
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

-- 5. Показываем статистику
SELECT 
    pr.email,
    pr.full_name,
    COUNT(p.id) as patient_count
FROM profiles pr
LEFT JOIN patients p ON p.doctor_id = pr.id
GROUP BY pr.id, pr.email, pr.full_name
ORDER BY patient_count DESC;
