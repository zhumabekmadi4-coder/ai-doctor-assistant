import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load variables from .env.local
dotenv.config({ path: '.env.local' });

interface TemplateImage {
    id: string;
    type: 'file' | 'url';
    data: string;
    caption?: string;
}

interface LocalTemplate {
    id: string;
    name: string;
    description?: string;
    headerText: string;
    content: string;
    images: TemplateImage[];
    createdAt: string;
    updatedAt: string;
    isPublic: boolean;
    authorLogin: string;
    authorName?: string;
}

async function importMyTemplates() {
    // Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase URL or Service Role Key in .env.local');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('🚀 Начало импорта ваших шаблонов в Supabase...\n');

    // Проверяем наличие файла my_templates.json
    const jsonPath = path.join(__dirname, 'my_templates.json');
    
    if (!fs.existsSync(jsonPath)) {
        console.error('❌ Файл my_templates.json не найден!');
        console.log('\n📋 Инструкция:');
        console.log('1. Откройте файл export_templates_from_browser.html в браузере');
        console.log('2. Нажмите "Найти шаблоны"');
        console.log('3. Нажмите "Скачать файл"');
        console.log('4. Переместите файл my_templates.json в папку scripts/');
        console.log('5. Запустите этот скрипт снова\n');
        process.exit(1);
    }

    // Читаем JSON файл
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const allTemplates: Record<string, LocalTemplate[]> = JSON.parse(fileContent);

    let totalTemplates = 0;
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    // Подсчитываем общее количество шаблонов
    for (const userLogin in allTemplates) {
        totalTemplates += allTemplates[userLogin].length;
    }

    console.log(`📊 Найдено ${totalTemplates} шаблонов от ${Object.keys(allTemplates).length} пользователей\n`);

    // Импортируем шаблоны для каждого пользователя
    for (const userLogin in allTemplates) {
        const templates = allTemplates[userLogin];
        console.log(`\n👤 Обработка шаблонов пользователя: ${userLogin}`);
        console.log(`   Количество шаблонов: ${templates.length}\n`);

        for (const template of templates) {
            try {
                // Проверяем, существует ли уже такой шаблон
                const { data: existing } = await supabaseAdmin
                    .from('templates')
                    .select('id')
                    .eq('title', template.name)
                    .eq('author_login', userLogin)
                    .single();

                if (existing) {
                    console.log(`   ⏭️  Шаблон "${template.name}" уже существует, пропускаем...`);
                    skippedCount++;
                    continue;
                }

                // Подготавливаем данные для вставки
                // Используем только базовые поля, которые точно существуют
                const templateData: any = {
                    title: template.name,
                    content: template.content,
                    created_at: template.createdAt || new Date().toISOString()
                };

                // Добавляем опциональные поля только если они поддерживаются
                // Эти поля будут работать только после выполнения update_database_schema.sql
                try {
                    if (template.description) templateData.description = template.description;
                    if (template.headerText) templateData.header_text = template.headerText;
                    if (template.isPublic !== undefined) templateData.is_public = template.isPublic;
                    if (userLogin) templateData.author_login = userLogin;
                    if (template.authorName) templateData.author_name = template.authorName;
                    if (template.images && template.images.length > 0) templateData.images = template.images;
                    if (template.updatedAt) templateData.updated_at = template.updatedAt;
                } catch (e) {
                    // Игнорируем ошибки для опциональных полей
                }

                console.log(`   📝 Добавление: "${template.name}"`);
                console.log(`      - Изображений: ${template.images?.length || 0}`);
                console.log(`      - Публичный: ${template.isPublic ? 'Да' : 'Нет'}`);

                const { error } = await supabaseAdmin
                    .from('templates')
                    .insert(templateData);

                if (error) {
                    console.error(`   ❌ Ошибка: ${error.message}`);
                    failCount++;
                } else {
                    console.log(`   ✅ Успешно добавлен\n`);
                    successCount++;
                }

            } catch (error: any) {
                console.error(`   ❌ Неожиданная ошибка при обработке "${template.name}":`, error.message);
                failCount++;
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ ИМПОРТА');
    console.log('='.repeat(60));
    console.log(`✅ Успешно импортировано: ${successCount}`);
    console.log(`❌ Ошибок: ${failCount}`);
    console.log(`⏭️  Пропущено (уже существуют): ${skippedCount}`);
    console.log(`📦 Всего обработано: ${totalTemplates}`);
    console.log('='.repeat(60) + '\n');

    if (successCount > 0) {
        console.log('🎉 Ваши шаблоны успешно импортированы в Supabase!');
        console.log('   Теперь они будут доступны после деплоя.\n');
    }

    if (failCount > 0) {
        console.log('⚠️  Некоторые шаблоны не удалось импортировать.');
        console.log('   Проверьте ошибки выше и попробуйте снова.\n');
    }
}

importMyTemplates()
    .then(() => {
        console.log('✨ Процесс импорта завершен.');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Критическая ошибка:', error);
        process.exit(1);
    });
