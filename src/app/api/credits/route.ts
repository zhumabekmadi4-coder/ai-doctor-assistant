import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/auth';

// GET /api/credits - returns credit balance
export async function GET(req: Request) {
  const auth = requireAuth(req);
    if (auth instanceof Response) return auth;

      try {
          const rows = await sql`SELECT key, value FROM settings WHERE key IN ('credits', 'clinic_name')`;
              const creditsRow = rows.find((r: any) => r.key === 'credits');
                  const clinicRow = rows.find((r: any) => r.key === 'clinic_name');
                      const credits = parseInt(creditsRow?.value ?? '0');
                          const clinicName = clinicRow?.value ?? 'AI Doctor Clinic';

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
                                                                              const auth = requireAdmin(req);
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