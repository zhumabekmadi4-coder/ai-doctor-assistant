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

async function importAllMyData() {
    // Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase URL or Service Role Key in .env.local');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('🚀 ПОЛНАЯ МИГРАЦИЯ ВАШИХ ДАННЫХ В SUPABASE...\n');
    console.log('=' .repeat(60));

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

    // Подсчитываем общее количество шаблонов
    for (const userLogin in allTemplates) {
        totalTemplates += allTemplates[userLogin].length;
    }

    console.log(`📊 Найдено ${totalTemplates} шаблонов от ${Object.keys(allTemplates).length} пользователей\n`);
    console.log('=' .repeat(60));

    // ШАГИ МИГРАЦИИ
    for (const userLogin in allTemplates) {
        const templates = allTemplates[userLogin];
        
        console.log(`\n👤 ПОЛЬЗОВАТЕЛЬ: ${userLogin}`);
        console.log('-'.repeat(60));

        // ШАГ 1: СОЗДАТЬ/ОБНОВИТЬ ПРОФИЛЬ
        console.log('\n📝 Шаг 1: Создание профиля...');
        
        const email = userLogin.includes('@') ? userLogin : `${userLogin}@example.com`;
        const fullName = templates[0]?.authorName || userLogin;

        try {
            // Проверяем существует ли профиль
            const { data: existingProfile } = await supabaseAdmin
                .from('profiles')
                .select('id, email, full_name')
                .eq('email', email)
                .single();

            if (existingProfile) {
                console.log(`   ✅ Профиль уже существует:`);
                console.log(`      Email: ${existingProfile.email}`);
                console.log(`      ФИО: ${existingProfile.full_name}`);
            } else {
                // Создаем нового пользователя в Auth
                console.log(`   🔐 Создание пользователя в Auth...`);
                const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email: email,
                    password: 'TempPassword123!', // Временный пароль
                    email_confirm: true,
                    user_metadata: {
                        full_name: fullName
                    }
                });

                if (authError) {
                    console.error(`   ❌ Ошибка создания пользователя: ${authError.message}`);
                    failCount += templates.length;
                    continue;
                }

                console.log(`   ✅ Пользователь создан в Auth`);
                console.log(`      Email: ${email}`);
                console.log(`      ФИО: ${fullName}`);
                console.log(`      ⚠️  Временный пароль: TempPassword123!`);
                console.log(`      📧 Смените пароль после первого входа!`);
            }

        } catch (error: any) {
            console.error(`   ❌ Ошибка при работе с профилем: ${error.message}`);
            failCount += templates.length;
            continue;
        }

        // ШАГ 2: УДАЛИТЬ СТАРЫЕ ШАБЛОНЫ ЭТОГО ПОЛЬЗОВАТЕЛЯ
        console.log('\n🗑️  Шаг 2: Удаление старых шаблонов...');
        try {
            const { error: deleteError } = await supabaseAdmin
                .from('templates')
                .delete()
                .eq('author_login', userLogin);

            if (deleteError) {
                console.log(`   ⚠️  Предупреждение: ${deleteError.message}`);
            } else {
                console.log(`   ✅ Старые шаблоны удалены`);
            }
        } catch (error: any) {
            console.log(`   ⚠️  Предупреждение: ${error.message}`);
        }

        // ШАГ 3: ИМПОРТИРОВАТЬ ШАБЛОНЫ
        console.log(`\n📦 Шаг 3: Импорт ${templates.length} шаблонов...\n`);

        for (const template of templates) {
            try {
                const templateData: any = {
                    title: template.name,
                    content: template.content,
                    description: template.description || '',
                    header_text: template.headerText || '',
                    is_public: template.isPublic || false,
                    author_login: userLogin,
                    author_name: template.authorName || userLogin,
                    images: template.images || [],
                    created_at: template.createdAt || new Date().toISOString(),
                    updated_at: template.updatedAt || new Date().toISOString()
                };

                console.log(`   📝 "${template.name}"`);
                console.log(`      - Изображений: ${template.images?.length || 0}`);
                console.log(`      - Публичный: ${template.isPublic ? 'Да' : 'Нет'}`);

                const { error } = await supabaseAdmin
                    .from('templates')
                    .insert(templateData);

                if (error) {
                    console.error(`      ❌ Ошибка: ${error.message}`);
                    failCount++;
                } else {
                    console.log(`      ✅ Успешно\n`);
                    successCount++;
                }

            } catch (error: any) {
                console.error(`   ❌ Ошибка при обработке "${template.name}": ${error.message}`);
                failCount++;
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ ПОЛНОЙ МИГРАЦИИ');
    console.log('='.repeat(60));
    console.log(`✅ Успешно импортировано шаблонов: ${successCount}`);
    console.log(`❌ Ошибок: ${failCount}`);
    console.log(`📦 Всего обработано: ${totalTemplates}`);
    console.log('='.repeat(60) + '\n');

    if (successCount > 0) {
        console.log('🎉 МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
        console.log('\n📋 Что дальше:');
        console.log('1. Войдите в приложение с вашим email');
        console.log('2. Используйте временный пароль: TempPassword123!');
        console.log('3. ОБЯЗАТЕЛЬНО смените пароль после входа!');
        console.log('4. Проверьте ваши шаблоны\n');
    }

    if (failCount > 0) {
        console.log('⚠️  Некоторые шаблоны не удалось импортировать.');
        console.log('   Проверьте ошибки выше.\n');
    }
}

importAllMyData()
    .then(() => {
        console.log('✨ Процесс завершен.');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Критическая ошибка:', error);
        process.exit(1);
    });
