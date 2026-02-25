import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/auth';

// GET /api/tokens - get current user's token balance
export async function GET(req: Request) {
    const auth = requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const rows = await sql`
            SELECT tokens_balance, tokens_reset_at
            FROM users
            WHERE login = ${auth.login}
        `;
        if (!rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json({
            balance: rows[0].tokens_balance,
            resetAt: rows[0].tokens_reset_at,
        });
    } catch (err) {
        console.error('Get tokens error:', err);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}

// PATCH /api/tokens - admin adds tokens to a user
// Body: { login: string, amount: number }
export async function PATCH(req: Request) {
    const auth = requireAdmin(req);
    if (auth instanceof Response) return auth;

    try {
        const { login, amount } = await req.json();
        if (!login || typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        const rows = await sql`
            UPDATE users
            SET tokens_balance = tokens_balance + ${amount}
            WHERE login = ${login} AND active = true
            RETURNING tokens_balance
        `;
        if (!rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json({ balance: rows[0].tokens_balance });
    } catch (err) {
        console.error('Add tokens error:', err);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
