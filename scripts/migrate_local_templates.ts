import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load variables from .env.local
dotenv.config({ path: '.env.local' });

// Дефолтные шаблоны из templates.ts
const defaultTemplates = [
    {
        name: 'Общие рекомендации по здоровому образу жизни',
        description: 'Базовые рекомендации для поддержания здоровья',
        headerText: 'здоровому образу жизни',
        content: `🌟 Основные рекомендации:

1. 💧 Питьевой режим
   • Пейте не менее 1.5-2 литров чистой воды в день
   • Начинайте утро со стакана теплой воды

2. 🥗 Питание
   • Придерживайтесь сбалансированного рациона
   • Ешьте больше овощей и фруктов
   • Ограничьте потребление сахара и соли
   • Питайтесь регулярно, 4-5 раз в день небольшими порциями

3. 🏃 Физическая активность
   • Минимум 30 минут умеренной активности ежедневно
   • Делайте перерывы при сидячей работе
   • Больше ходите пешком

4. 😴 Сон
   • Спите 7-8 часов в сутки
   • Ложитесь и вставайте в одно время
   • Проветривайте спальню перед сном

5. 🧘 Стресс
   • Практикуйте техники релаксации
   • Найдите время для хобби
   • Общайтесь с близкими

При возникновении вопросов или ухудшении самочувствия - обращайтесь к врачу!`,
        category: 'Общие рекомендации',
        isPublic: true,
        authorLogin: 'system',
        authorName: 'Система'
    },
    {
        name: 'Рекомендации при ОРВИ',
        description: 'Советы по лечению простудных заболеваний',
        headerText: 'при ОРВИ',
        content: `🤒 Рекомендации при простуде:

1. 🏠 Режим
   • Соблюдайте постельный режим первые 2-3 дня
   • Избегайте переохлаждения
   • Проветривайте помещение 3-4 раза в день

2. 💊 Лечение
   • Принимайте назначенные препараты строго по схеме
   • При температуре выше 38.5°C - жаропонижающие
   • Полоскайте горло солевым раствором 4-5 раз в день

3. 💧 Питьевой режим
   • Обильное теплое питье: чай с лимоном, морс, компот
   • Не менее 2-2.5 литров жидкости в день
   • Избегайте холодных напитков

4. 🍲 Питание
   • Легкая, витаминизированная пища
   • Бульоны, каши, фрукты
   • Избегайте тяжелой, жирной пищи

5. ⚠️ Когда обратиться к врачу:
   • Температура выше 39°C более 3 дней
   • Затрудненное дыхание
   • Сильная головная боль
   • Боль в груди

Выздоравливайте! 🌸`,
        category: 'ОРВИ и простуда',
        isPublic: true,
        authorLogin: 'system',
        authorName: 'Система'
    },
    {
        name: 'Рекомендации по питанию при гастрите',
        description: 'Диетические рекомендации для пациентов с гастритом',
        headerText: 'по питанию при гастрите',
        content: `🥄 Диета при гастрите:

✅ РЕКОМЕНДУЕТСЯ:

1. 🥣 Каши
   • Овсяная, рисовая, гречневая на воде
   • Хорошо разваренные, протертые

2. 🥔 Овощи
   • Картофель, морковь, свекла (отварные)
   • Тыква, кабачки
   • В виде пюре или супов-пюре

3. 🍗 Белки
   • Нежирное мясо (курица, индейка, кролик)
   • Рыба нежирных сортов
   • Паровые котлеты, тефтели

4. 🥛 Молочные продукты
   • Нежирное молоко
   • Творог некислый
   • Йогурт без добавок

❌ ИСКЛЮЧИТЬ:

• Жирное, жареное, копченое
• Острые специи и приправы
• Кислые фрукты и ягоды
• Свежий хлеб, сдобу
• Газированные напитки
• Кофе, крепкий чай
• Алкоголь

📋 Режим питания:
• 5-6 раз в день небольшими порциями
• Тщательно пережевывайте пищу
• Не ешьте на ночь
• Пища должна быть теплой (не горячей и не холодной)

Соблюдайте диету минимум 2-3 месяца! 🌿`,
        category: 'Гастроэнтерология',
        isPublic: true,
        authorLogin: 'system',
        authorName: 'Система'
    }
];

async function migrateLocalTemplates() {
    // Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase URL or Service Role Key in .env.local');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('Starting migration of local templates to Supabase...');
    console.log(`Found ${defaultTemplates.length} default templates to migrate.\n`);

    let templatesMigrated = 0;
    let templatesFailed = 0;

    for (const template of defaultTemplates) {
        try {
            // Проверяем, существует ли уже такой шаблон
            const { data: existing, error: checkError } = await supabaseAdmin
                .from('templates')
                .select('id')
                .eq('title', template.name)
                .single();

            if (existing) {
                console.log(`⏭️  Шаблон "${template.name}" уже существует, пропускаем...`);
                continue;
            }

            const templateData = {
                title: template.name,
                category: template.category,
                content: template.content,
                description: template.description,
                header_text: template.headerText,
                is_public: template.isPublic,
                author_login: template.authorLogin,
                author_name: template.authorName,
                created_at: new Date().toISOString()
            };

            console.log(`📝 Добавление шаблона: ${templateData.title}`);
            
            const { error } = await supabaseAdmin.from('templates').insert(templateData);
            
            if (error) {
                console.error(`❌ Ошибка при добавлении шаблона "${templateData.title}":`, error);
                templatesFailed++;
            } else {
                templatesMigrated++;
                console.log(`✅ Успешно добавлен шаблон: ${templateData.title}\n`);
            }
        } catch (error) {
            console.error(`❌ Неожиданная ошибка при обработке шаблона "${template.name}":`, error);
            templatesFailed++;
        }
    }
    
    console.log('\n=== Результаты миграции ===');
    console.log(`✅ Успешно мигрировано шаблонов: ${templatesMigrated}`);
    console.log(`❌ Не удалось мигрировать: ${templatesFailed}`);
    console.log(`⏭️  Пропущено (уже существуют): ${defaultTemplates.length - templatesMigrated - templatesFailed}`);
    console.log('\n--- Миграция локальных шаблонов завершена ---');
}

migrateLocalTemplates()
    .then(() => {
        console.log('\n✨ Процесс миграции успешно завершен.');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Процесс миграции завершился с ошибкой:', error);
        process.exit(1);
    });
