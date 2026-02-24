import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassword, isLegacyHash, hashPassword, signSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
      // Rate limiting by IP
          const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
              if (!checkRateLimit(`auth:${ip}`, 5, 15 * 60 * 1000)) {
                    return NextResponse.json(
                            { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
                                    { status: 429 }
                                          );
                                              }

                                                  const { username, password } = await req.json();
                                                      if (!username || !password) {
                                                            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
                                                                }

                                                                    const rows = await sql`SELECT * FROM users WHERE LOWER(login) = LOWER(${username.trim()})`;
                                                                        const user = rows[0];

                                                                            if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
                                                                                if (!user.active) return NextResponse.json({ error: 'Account disabled' }, { status: 403 });

                                                                                    const isValid = await verifyPassword(password, user.password_hash);
                                                                                        if (!isValid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

                                                                                            // Auto-migrate legacy hash to bcrypt if needed
                                                                                                if (isLegacyHash(user.password_hash)) {
                                                                                                      try {
                                                                                                              const newHash = await hashPassword(password);
                                                                                                                      await sql`UPDATE users SET password_hash = ${newHash} WHERE login = ${user.login}`;
                                                                                                                            } catch (err) {
                                                                                                                                    console.warn('Failed to auto-migrate hash:', err);
                                                                                                                                            // Non-critical - login still succeeds
                                                                                                                                                  }
                                                                                                                                                      }

                                                                                                                                                          const { login, name, specialty, role } = user;

                                                                                                                                                              // Create signed session token (no PII/secrets inside)
                                                                                                                                                                  const token = signSession({ login, role: role || 'doctor', name: name || '' });

                                                                                                                                                                      return NextResponse.json({
                                                                                                                                                                            success: true,
                                                                                                                                                                                  user: { login, name, specialty, role },
                                                                                                                                                                                        token,
                                                                                                                                                                                            });
                                                                                                                                                                                              } catch (err) {
                                                                                                                                                                                                  console.error('Auth error:', err);
                                                                                                                                                                                                      return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
                                                                                                                                                                                                        }
                                                                                                                                                                                                        }

                                                                                                                                                                                                        export async function GET() {
                                                                                                                                                                                                          return NextResponse.json({ status: 'Auth endpoint active' });
                                                                                                                                                                                                          }