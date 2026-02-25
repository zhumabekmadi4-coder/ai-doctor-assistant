import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function importTemplates() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error('❌ Переменные окружения Supabase не найдены');
        process.exit(1);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Читаем JSON
    const jsonPath = path.resolve('my_templates.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('❌ Файл my_templates.json не найден в корне проекта');
        process.exit(1);
    }

    console.log('📖 Чтение my_templates.json...');
    const fileData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const rawTemplates = fileData.zhuma_md || [];

    if (rawTemplates.length === 0) {
        console.warn('⚠️ Шаблоны не найдены в JSON (ключ zhuma_md пуст)');
        return;
    }

    // 2. Находим пользователя
    const targetEmail = 'zhumabekmadi4@gmail.com';
    const { data: profile, error: pErr } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', targetEmail)
        .single();

    if (pErr || !profile) {
        // Попробуем найти по логину в full_name если email не сработал (хотя SQL показал email есть)
        console.error('❌ Профиль не найден для:', targetEmail, pErr?.message);
        return;
    }

    console.log(`✅ Найден ID пользователя: ${profile.id}`);

    // 3. Форматируем шаблоны для вставки
    const templatesToInsert = rawTemplates.map((t: any) => ({
        name: t.name,
        description: t.description || '',
        header_text: t.headerText || '',
        content: t.content || '',
        images: t.images || [],
        is_public: t.isPublic || false,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
        author_id: profile.id
    }));

    // 4. Очистка старых аналогичных шаблонов у этого пользователя (чтобы не дублировать)
    console.log('🧹 Проверка на дубликаты...');
    for (const t of templatesToInsert) {
        await supabaseAdmin
            .from('templates')
            .delete()
            .eq('author_id', profile.id)
            .eq('name', t.name);
    }

    // 5. Вставка
    console.log(`📤 Загрузка ${templatesToInsert.length} шаблонов в Supabase...`);
    const { error: iErr } = await supabaseAdmin.from('templates').insert(templatesToInsert);

    if (iErr) {
        console.error('❌ Ошибка при вставке в таблицу templates:', iErr.message);
    } else {
        console.log('🎉 Все шаблоны успешно импортированы!');
        console.log('💡 Не забудьте выйти (Logout) и войти (Login) в приложении, чтобы обновить сессию!');
    }
}

importTemplates().catch(err => {
    console.error('💀 Критическая ошибка скрипта:', err);
});
