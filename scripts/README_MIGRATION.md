# Инструкция по миграции на Supabase с системой индивидуальных кредитов

## Обзор

Этот документ описывает процесс миграции приложения JAZai Doc с Google Sheets на Supabase с внедрением системы индивидуальных кредитов для врачей.

## Что изменилось

### 1. База данных
- **Переход с Google Sheets на Supabase** - полноценная PostgreSQL база данных
- **Система кредитов** - теперь каждый врач имеет индивидуальный баланс кредитов
- **Тарифные планы** - поддержка различных уровней подписки (free, basic, pro, unlimited)
- **История транзакций** - отслеживание всех операций с кредитами

### 2. Шаблоны
- Расширенная структура шаблонов с поддержкой:
  - Описания и заголовков
  - Публичных/приватных шаблонов
  - Авторства шаблонов
  - Изображений в шаблонах

### 3. Модель распространения
- **Было**: Лицензирование по клиникам
- **Стало**: Индивидуальные лицензии для врачей

## Шаги миграции

### Шаг 1: Подготовка Supabase

1. Откройте ваш проект в Supabase Dashboard
2. Перейдите в раздел **SQL Editor**
3. Скопируйте содержимое файла `update_database_schema.sql`
4. Вставьте в SQL Editor и выполните скрипт
5. Убедитесь, что все команды выполнились успешно

### Шаг 2: Проверка структуры

После выполнения SQL-скрипта у вас должны быть следующие таблицы:

#### Обновленные таблицы:
- **templates** - с новыми полями: `description`, `header_text`, `is_public`, `author_login`, `author_name`, `images`
- **profiles** - с новыми полями: `credits`, `total_credits_used`, `subscription_type`, `is_active`
- **patients** - с новым полем: `credits_used`

#### Новые таблицы:
- **credit_transactions** - история операций с кредитами
- **subscription_plans** - тарифные планы

### Шаг 3: Миграция данных

#### 3.1 Миграция пациентов и пользователей из Google Sheets

```bash
cd C:\Antigravity\ai-doctor-assistant
npx tsx scripts/improved_migrate_google_sheets_data.ts
```

#### 3.2 Миграция локальных шаблонов

```bash
npx tsx scripts/migrate_local_templates.ts
```

### Шаг 4: Настройка начальных кредитов

Все новые пользователи автоматически получают 10 бесплатных кредитов при создании профиля.

Для добавления кредитов существующим пользователям используйте SQL:

```sql
-- Добавить 100 кредитов конкретному пользователю
SELECT add_credits(
    'USER_UUID'::uuid,
    100,
    'Начисление тестовых кредитов'
);

-- Добавить кредиты всем активным пользователям
UPDATE profiles 
SET credits = credits + 50 
WHERE is_active = true;
```

### Шаг 5: Проверка миграции

Запустите скрипт проверки:

```bash
npx tsx scripts/verify_migration.ts
```

## Система кредитов

### Тарифные планы

| План | Кредитов/месяц | Цена (месяц) | Цена (год) |
|------|----------------|--------------|------------|
| Free | 10 | 0₸ | 0₸ |
| Basic | 100 | 990₸ | 9,900₸ |
| Pro | 500 | 2,990₸ | 29,900₸ |
| Unlimited | 999,999 | 9,990₸ | 99,900₸ |

### Использование кредитов

Кредиты списываются за:
- Использование AI для заполнения карты пациента
- Генерация рекомендаций
- Транскрипция голосовых записей

### Функции для работы с кредитами

#### Списание кредитов
```sql
SELECT deduct_credits(
    user_id::uuid,
    amount::integer,
    'Описание операции'
);
```

#### Добавление кредитов
```sql
SELECT add_credits(
    user_id::uuid,
    amount::integer,
    'Описание операции'
);
```

#### Проверка баланса
```sql
SELECT credits, total_credits_used, subscription_type
FROM profiles
WHERE id = 'USER_UUID';
```

## Row Level Security (RLS)

Все таблицы защищены политиками RLS:

- **templates**: Пользователи видят только свои шаблоны и публичные шаблоны других
- **credit_transactions**: Пользователи видят только свои транзакции
- **patients**: Пользователи видят только своих пациентов
- **subscription_plans**: Все могут видеть активные тарифные планы

## API Endpoints для работы с кредитами

### Получение баланса кредитов
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('credits, subscription_type')
  .eq('id', userId)
  .single();
```

### Получение истории транзакций
```typescript
const { data, error } = await supabase
  .from('credit_transactions')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Списание кредитов (через RPC)
```typescript
const { data, error } = await supabase.rpc('deduct_credits', {
  p_user_id: userId,
  p_amount: 1,
  p_description: 'Использование AI ассистента'
});
```

## Мониторинг и статистика

### Просмотр статистики по кредитам
```sql
SELECT * FROM user_credit_stats
WHERE email = 'doctor@example.com';
```

### Топ пользователей по использованию
```sql
SELECT 
    email,
    full_name,
    total_credits_used,
    subscription_type
FROM profiles
ORDER BY total_credits_used DESC
LIMIT 10;
```

## Troubleshooting

### Проблема: Пользователь не может войти

**Решение**: Проверьте, что профиль активен:
```sql
UPDATE profiles 
SET is_active = true 
WHERE email = 'user@example.com';
```

### Проблема: Не хватает кредитов

**Решение**: Добавьте кредиты вручную:
```sql
SELECT add_credits(
    (SELECT id FROM profiles WHERE email = 'user@example.com'),
    100,
    'Ручное пополнение'
);
```

### Проблема: Шаблоны не отображаются

**Решение**: Проверьте RLS политики и убедитесь, что `author_login` соответствует email пользователя.

## Следующие шаги

1. ✅ Выполнить SQL-скрипт обновления структуры
2. ✅ Мигрировать данные из Google Sheets
3. ✅ Мигрировать локальные шаблоны
4. ⏳ Обновить фронтенд для работы с кредитами
5. ⏳ Настроить систему оплаты (интеграция с платежной системой)
6. ⏳ Добавить уведомления о низком балансе кредитов
7. ⏳ Реализовать автоматическое пополнение кредитов по подписке

## Контакты и поддержка

При возникновении проблем обращайтесь к документации Supabase или создайте issue в репозитории проекта.
