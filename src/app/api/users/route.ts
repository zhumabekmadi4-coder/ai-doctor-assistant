import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { hashPassword, requireAdmin } from '@/lib/auth';

// GET /api/users - list all users (admin only)
export async function GET(req: Request) {
  const auth = requireAdmin(req);
    if (auth instanceof Response) return auth;

      try {
          const data = await sql`SELECT id, login, name, specialty, role, active FROM users ORDER BY id`;
              const users = data.map((u: any) => ({
                    rowIndex: u.id,
                          login: u.login,
                                name: u.name,
                                      specialty: u.specialty,
                                            role: u.role,
                                                  active: u.active,
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
                                                                                    if (!login || !password) {
                                                                                          return NextResponse.json({ error: 'Login and password required' }, { status: 400 });
                                                                                              }
                                                                                                  const hashed = await hashPassword(password);
                                                                                                      await sql`
                                                                                                            INSERT INTO users (login, password_hash, name, specialty, role, active)
                                                                                                                  VALUES (${login}, ${hashed}, ${name ?? ''}, ${specialty ?? ''}, ${role ?? 'doctor'}, true)
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

                                                                                                                                                        if (password) {
                                                                                                                                                              const hashed = await hashPassword(password);
                                                                                                                                                                    await sql`UPDATE users SET name=${name}, specialty=${specialty}, role=${role}, active=${active}, password_hash=${hashed} WHERE id=${rowIndex}`;
                                                                                                                                                                        } else {
                                                                                                                                                                              await sql`UPDATE users SET name=${name}, specialty=${specialty}, role=${role}, active=${active} WHERE id=${rowIndex}`;
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