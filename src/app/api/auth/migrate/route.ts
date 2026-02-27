import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// DELETE /api/auth/migrate — delete all users except the specified login (admin only)
export async function DELETE(req: Request) {
    const auth = requireAdmin(req);
    if (auth instanceof Response) return auth;

    const { keepLogin } = await req.json();
    if (!keepLogin || typeof keepLogin !== 'string') {
        return NextResponse.json({ error: 'keepLogin is required' }, { status: 400 });
    }

    const result = await sql`
        DELETE FROM users
        WHERE login != ${keepLogin}
        RETURNING login
    `;

    return NextResponse.json({
        success: true,
        deleted: result.map((r: any) => r.login),
        kept: keepLogin,
    });
}
