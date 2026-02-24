import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/credits - returns credit balance
export async function GET(req: Request) {
  const auth = requireAuth(req);
    if (auth instanceof Response) return auth;

      try {
          const rows = await sql`SELECT value FROM settings WHERE key = 'credits'`;
              const credits = parseInt(rows[0]?.value ?? '0');

                  const clinicRows = await sql`SELECT value FROM settings WHERE key = 'clinic_name'`;
                      const clinicName = clinicRows[0]?.value ?? '';

                          return NextResponse.json({
                                clinicName,
                                      totalCredits: credits,
                                            usedCredits: 0,
                                                  remainingCredits: credits,
                                                        unlimited: false,
                                                            });
                                                              } catch (err) {
                                                                  console.error('Credits error:', err);
                                                                      return NextResponse.json({ error: 'DB error' }, { status: 500 });
                                                                        }
                                                                        }

                                                                        // PATCH /api/credits - update credits (admin only)
                                                                        export async function PATCH(req: Request) {
                                                                          const auth = requireAuth(req);
                                                                            if (auth instanceof Response) return auth;

                                                                              try {
                                                                                  const { credits } = await req.json();
                                                                                      await sql`UPDATE settings SET value = ${String(credits)} WHERE key = 'credits'`;
                                                                                          return NextResponse.json({ success: true });
                                                                                            } catch (err) {
                                                                                                console.error('Update credits error:', err);
                                                                                                    return NextResponse.json({ error: 'DB error' }, { status: 500 });
                                                                                                      }
                                                                                                      }