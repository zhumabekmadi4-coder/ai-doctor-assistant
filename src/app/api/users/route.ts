import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { hashPassword, requireAdmin } from '@/lib/auth';

const ALLOWED_ROLES = ['admin', 'doctor'] as const;
type Role = typeof ALLOWED_ROLES[number];

function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return 'Password must be a string';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password is too long';
  return null;
}

function validateRole(role: unknown): Role {
  if (ALLOWED_ROLES.includes(role as Role)) return role as Role;
  return 'doctor';
}

// GET /api/users - list all users (admin only)
export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const data = await sql`SELECT id, login, name, specialty, role, active, tokens_balance FROM users ORDER BY id`;
    const users = data.map((u: any) => ({
      rowIndex: u.id,
      login: u.login,
      name: u.name,
      specialty: u.specialty,
      role: u.role,
      active: u.active,
      tokens_balance: u.tokens_balance ?? 15,
    }));
    return NextResponse.json({ users });
  } catch (err) {
    console.error('Get users error:', err);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

// POST /api/users - create new user (admin only)
export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const { login, password, name, specialty, role } = await req.json();

    if (!login || typeof login !== 'string') {
      return NextResponse.json({ error: 'Login is required' }, { status: 400 });
    }
    if (login.length < 3 || login.length > 50) {
      return NextResponse.json({ error: 'Login must be 3–50 characters' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(login)) {
      return NextResponse.json({ error: 'Login may only contain letters, digits, _ . -' }, { status: 400 });
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    const safeRole = validateRole(role);
    const hashed = await hashPassword(password);
    await sql`
      INSERT INTO users (login, password_hash, name, specialty, role, active)
      VALUES (${login}, ${hashed}, ${name ?? ''}, ${specialty ?? ''}, ${safeRole}, true)
    `;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PATCH /api/users - update user (admin only)
export async function PATCH(req: Request) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const { rowIndex, name, specialty, role, active, password } = await req.json();
    if (!rowIndex) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const safeRole = validateRole(role);

    if (password) {
      const pwdError = validatePassword(password);
      if (pwdError) return NextResponse.json({ error: pwdError }, { status: 400 });
      const hashed = await hashPassword(password);
      await sql`UPDATE users SET name=${name}, specialty=${specialty}, role=${safeRole}, active=${active}, password_hash=${hashed} WHERE id=${rowIndex}`;
    } else {
      await sql`UPDATE users SET name=${name}, specialty=${specialty}, role=${safeRole}, active=${active} WHERE id=${rowIndex}`;
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/users - delete user (admin only)
export async function DELETE(req: Request) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const { rowIndex } = await req.json();
    if (!rowIndex) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await sql`DELETE FROM users WHERE id = ${rowIndex}`;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
