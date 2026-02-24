import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(req: Request) {
  const auth = requireAuth(req);
    if (auth instanceof Response) return auth;

      try {
          const body = await req.json();
              const {
                    patientName, dob, visitDate, complaints,
                          anamnesis, diagnosis, treatment, recommendations, doctor
                              } = body;

                                  const doctorLogin = auth.login;

                                      // Check credits using key-value settings schema
                                          const settingsRows = await sql`SELECT value FROM settings WHERE key = 'credits'`;
                                              const currentCredits = parseInt(settingsRows[0]?.value ?? '0');

                                                  if (currentCredits <= 0) {
                                                        return NextResponse.json({ error: 'No credits left' }, { status: 403 });
                                                            }

                                                                await sql`
                                                                      INSERT INTO patients (
                                                                              patient_name, dob, visit_date, complaints,
                                                                                      anamnesis, diagnosis, treatment, recommendations,
                                                                                              doctor_login, doctor_name, doctor_specialty, saved_at
                                                                                                    ) VALUES (
                                                                                                            ${patientName}, ${dob}, ${visitDate}, ${complaints},
                                                                                                                    ${anamnesis}, ${diagnosis}, ${treatment}, ${recommendations},
                                                                                                                            ${doctorLogin}, ${doctor?.name ?? ''}, ${doctor?.specialty ?? ''},
                                                                                                                                    NOW()
                                                                                                                                          )
                                                                                                                                              `;

                                                                                                                                                  const newCredits = currentCredits - 1;
                                                                                                                                                      await sql`UPDATE settings SET value = ${String(newCredits)} WHERE key = 'credits'`;

                                                                                                                                                          return NextResponse.json({ success: true, creditsLeft: newCredits });
                                                                                                                                                            } catch (err) {
                                                                                                                                                                console.error(err);
                                                                                                                                                                    return NextResponse.json({ error: 'DB error' }, { status: 500 });
                                                                                                                                                                      }
                                                                                                                                                                      }