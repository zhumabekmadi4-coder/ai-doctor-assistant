import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load variables from .env.local
dotenv.config({ path: '.env.local' });

async function main() {
    const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY
                ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
                : undefined,
        },
        scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('🚀 ЗАПУСК ПОЛНОГО ВОССТАНОВЛЕНИЯ ДАННЫХ...');

    // 1. Находим ваш ID в Supabase
    console.log('🔍 Поиск профиля по логину zhuma_md...');
    const { data: profiles, error: pErr } = await supabaseAdmin
        .from('profiles')
        .select('*');

    if (pErr) {
        console.error('❌ ОШИБКА ДОСТУПА К БАЗЕ:', pErr.message);
        console.log('ℹ️ Это значит, что Supabase блокирует запрос. Проверьте SQL-разрешения или RLS.');
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.error('❌ В таблице profiles нет ни одной записи!');
        return;
    }

    // Ищем профиль, где упоминается zhuma_md или это единственный профиль
    let profile = profiles.find(p =>
        p.email?.toLowerCase().includes('zhuma_md') ||
        p.full_name?.toLowerCase().includes('zhuma_md')
    );

    if (!profile && profiles.length === 1) {
        profile = profiles[0];
        console.log(`⚠️ Прямого совпадения 'zhuma_md' не нашли, использую единственный существующий профиль (ID: ${profile.id}).`);
    }

    if (!profile) {
        console.log('❌ Профиль не найден. Список в базе:');
        profiles.forEach(p => console.log(`- ID: ${p.id}, Email: ${p.email}, Name: ${p.full_name}`));
        return;
    }

    const myId = profile.id;
    console.log(`✅ Профиль определен (ID: ${myId})`);

    // Обновляем профиль (ставим админа и почту для связи)
    console.log('👑 Обновление прав до Администратора...');
    await supabaseAdmin.from('profiles').update({
        role: 'admin',
        full_name: 'Мади Жумабек',
        email: 'zhumabekmadi4@gmail.com'
    }).eq('id', myId);

    // 2. Читаем пациентов из "Лист1"
    console.log('📦 Загрузка пациентов из Google Sheets...');
    const patientsRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Лист1!A:K',
    });

    const rows = patientsRes.data.values || [];
    let count = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[0]) continue; // Пропуск пустых

        const patientData = {
            patient_name: row[0],
            dob: row[1] || null,
            visit_date: row[2] || null,
            complaints: row[3] || null,
            anamnesis: row[4] || null,
            diagnosis: row[5] || null,
            treatment: row[6] || null,
            recommendations: row[7] || null,
            doctor_id: myId, // ПРИНУДИТЕЛЬНО ПРИВЯЗЫВАЕМ К ВАМ
            created_at: row[10] ? new Date(row[10]).toISOString() : new Date().toISOString()
        };

        const { error: insErr } = await supabaseAdmin.from('patients').insert(patientData);
        if (insErr) {
            console.error(`⚠️ Ошибка при вставке ${row[0]}:`, insErr.message);
        } else {
            count++;
        }
    }
    console.log(`✅ Восстановлено пациентов: ${count}`);

    // 3. Читаем шаблоны (пробуем найти лист)
    console.log('📦 Поиск и загрузка шаблонов...');
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const templateSheet = spreadsheet.data.sheets?.find(s =>
        ['Templates', 'Шаблоны', 'Templates_v2'].includes(s.properties?.title || '')
    );

    if (templateSheet) {
        const tTitle = templateSheet.properties?.title;
        const tRes = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${tTitle}!A:Z`,
        });
        const tRows = tRes.data.values || [];
        let tCount = 0;

        for (let i = 1; i < tRows.length; i++) {
            const r = tRows[i];
            if (!r[0]) continue;

            const tData = {
                title: r[0],
                category: r[1] || 'Общее',
                content: r[2] || '',
                author_login: 'zhumabekmadi4@gmail.com',
                author_name: 'Мади Жумабек',
                created_at: new Date().toISOString()
            };

            await supabaseAdmin.from('templates').insert(tData);
            tCount++;
        }
        console.log(`✅ Восстановлено шаблонов: ${tCount}`);
    } else {
        console.log('⚠️ Лист с шаблонами не найден. Если они нужны, уточните название вкладки.');
    }

    console.log('\n✨ ГОТОВО! Проверьте приложение.');
}

main().catch(console.error);
