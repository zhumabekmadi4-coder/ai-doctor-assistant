import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// Temporary password reset endpoint
// POST /api/reset-password
// Body: { login: string, newPassword: string, secret: string }
// secret must match RESET_SECRET env var (or 'jazai-reset-2026' by default)
export async function POST(req: Request) {
  try {
      const { login, newPassword, secret } = await req.json();
          const expectedSecret = process.env.RESET_SECRET || 'jazai-reset-2026';

              if (secret !== expectedSecret) {
                    return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
                        }
                            if (!login || !newPassword) {
                                  return NextResponse.json({ error: 'Missing login or newPassword' }, { status: 400 });
                                      }

                                          const hashed = await hashPassword(newPassword);
                                              const result = await sql`UPDATE users SET password_hash = ${hashed} WHERE LOWER(login) = LOWER(${login}) RETURNING login, name`;

                                                  if (result.length === 0) {
                                                        return NextResponse.json({ error: 'User not found' }, { status: 404 });
                                                            }

                                                                return NextResponse.json({ success: true, login: result[0].login, name: result[0].name });
                                                                  } catch (err) {
                                                                      console.error('Reset password error:', err);
                                                                          return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
                                                                            }
                                                                            }