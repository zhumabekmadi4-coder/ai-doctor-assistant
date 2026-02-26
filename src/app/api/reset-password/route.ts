import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

// Admin-only password reset endpoint (server-side tool, not a self-service reset)
// POST /api/reset-password  Body: { login, newPassword, secret }
export async function POST(req: Request) {
  // Rate limit: 5 attempts per 15 min per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`reset:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
      { status: 429 }
    );
  }

  try {
    const { login, newPassword, secret } = await req.json();

    // Require RESET_SECRET from env — no hardcoded fallback
    const expectedSecret = process.env.RESET_SECRET;
    if (!expectedSecret) {
      console.error('[reset-password] RESET_SECRET env var is not set');
      return NextResponse.json({ error: 'Endpoint not configured' }, { status: 503 });
    }

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    if (!login || !newPassword) {
      return NextResponse.json({ error: 'Missing login or newPassword' }, { status: 400 });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword);
    const result = await sql`
      UPDATE users SET password_hash = ${hashed}
      WHERE LOWER(login) = LOWER(${login})
      RETURNING login, name
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`[reset-password] Password reset for: ${result[0].login} from IP: ${ip}`);
    return NextResponse.json({ success: true, login: result[0].login, name: result[0].name });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
