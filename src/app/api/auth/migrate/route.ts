import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';

// This endpoint receives:
// - email
// - password
// - migrationToken (issued by /api/auth)
export async function POST(req: Request) {
    try {
        const { email, password, migrationToken } = await req.json();

        if (!email || !password || !migrationToken) {
            return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
        }

        // Verify the migration token
        const payload = verifySession(migrationToken);
        if (!payload) {
            return NextResponse.json({ error: 'Неверный или устаревший токен миграции' }, { status: 401 });
        }

        const { login, role, name, specialty } = payload as any;
        const supabaseAdmin = createAdminClient();

        // 1. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto confirm
        });

        if (authError || !authData.user) {
            console.error('Migration auth error details:', authError);
            if (authError?.message?.includes('already registered') || authError?.code === 'email_exists' || authError?.status === 422) {
                return NextResponse.json({ error: 'Этот email уже зарегистрирован. Пожалуйста, используйте его для входа без миграции.' }, { status: 400 });
            }
            return NextResponse.json({ error: 'Ошибка регистрации в новой системе' }, { status: 500 });
        }

        const userId = authData.user.id;

        // 2. Insert into profiles table with upsert logic
        // We use upsert to handle cases where the profile might have been partially created
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                full_name: name || login,
                role: role || 'doctor',
                specialty: specialty || null,
                tokens_balance: 10, // New migrated doctors get 10 free tokens
                email: email
            }, { onConflict: 'id' });

        if (profileError) {
            console.error('Profile creation error during migration:', profileError);

            // If the error is about missing 'email' or 'tokens_balance' columns, 
            // the user needs to run the SQL script I provided.
            if (profileError.message?.includes('column') || profileError.code === '42703') {
                return NextResponse.json({
                    error: 'Ошибка базы данных: отсутствуют необходимые колонки. Пожалуйста, выполните предоставленный SQL скрипт в панели Supabase.'
                }, { status: 500 });
            }

            return NextResponse.json({ error: 'Ошибка создания профиля: ' + profileError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Миграция успешно завершена. Теперь войдите по email и паролю.',
        });
    } catch (err) {
        console.error('Migration route error:', err);
        return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
    }
}
