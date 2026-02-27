import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword, verifyGoogleTemp, signSession } from '@/lib/auth';

// POST /api/auth/register — complete Google registration (create account with login+password)
export async function POST(req: Request) {
    try {
        const { token, login, password, name, specialty } = await req.json();

        // Verify Google temp token
        const googleData = verifyGoogleTemp(token);
        if (!googleData) {
            return NextResponse.json(
                { error: 'Ссылка регистрации недействительна или истекла. Начните заново.' },
                { status: 400 }
            );
        }

        // Validate login
        if (!login || typeof login !== 'string') {
            return NextResponse.json({ error: 'Логин обязателен' }, { status: 400 });
        }
        if (login.length < 3 || login.length > 50) {
            return NextResponse.json({ error: 'Логин: от 3 до 50 символов' }, { status: 400 });
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(login)) {
            return NextResponse.json({ error: 'Логин может содержать только буквы, цифры, _ . -' }, { status: 400 });
        }

        // Validate password
        if (!password || typeof password !== 'string') {
            return NextResponse.json({ error: 'Пароль обязателен' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: 'Пароль: минимум 6 символов' }, { status: 400 });
        }

        // Check login uniqueness
        const existing = await sql`SELECT 1 FROM users WHERE login = ${login}`;
        if (existing.length > 0) {
            return NextResponse.json({ error: 'Этот логин уже занят' }, { status: 409 });
        }

        // Check google_id uniqueness (race condition guard)
        const existingGoogle = await sql`SELECT 1 FROM users WHERE google_id = ${googleData.googleId}`;
        if (existingGoogle.length > 0) {
            return NextResponse.json({ error: 'Этот Google-аккаунт уже зарегистрирован' }, { status: 409 });
        }

        const passwordHash = await hashPassword(password);
        const displayName = (name || '').trim() || login;
        const safeSpecialty = (specialty || '').trim();

        const newRows = await sql`
            INSERT INTO users (login, password_hash, name, specialty, email, google_id, role, active, tokens_balance)
            VALUES (${login}, ${passwordHash}, ${displayName}, ${safeSpecialty}, ${googleData.email}, ${googleData.googleId}, 'doctor', true, 15)
            RETURNING login, name, specialty, role
        `;

        const user = newRows[0];

        // Sign session and return
        const sessionToken = signSession({
            login: user.login,
            role: user.role,
            name: user.name,
        });

        return NextResponse.json({
            success: true,
            token: sessionToken,
            user: {
                login: user.login,
                name: user.name,
                specialty: user.specialty || '',
                role: user.role,
            },
        });

    } catch (err: any) {
        console.error('[Register] Error:', err);
        if (err?.code === '23505') {
            return NextResponse.json({ error: 'Логин уже занят' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
    }
}
