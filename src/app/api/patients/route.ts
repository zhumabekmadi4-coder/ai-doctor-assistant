import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  const auth = requireAuth(req);
    if (auth instanceof Response) return auth;

      try {
          const data = await sql`SELECT * FROM patients ORDER BY saved_at DESC`;
              const patients = data.map((p: any) => ({
                    rowIndex: p.id,
                          id: p.id,
                                patientName: p.patient_name,
                                      dob: p.dob,
                                            visitDate: p.visit_date,
                                                  complaints: p.complaints,
                                                        anamnesis: p.anamnesis,
                                                              diagnosis: p.diagnosis,
                                                                    treatment: p.treatment,
                                                                          recommendations: p.recommendations,
                                                                                doctorName: p.doctor_name,
                                                                                      doctorSpecialty: p.doctor_specialty,
                                                                                            savedAt: p.saved_at,
                                                                                                }));
                                                                                                    return NextResponse.json({ patients });
                                                                                                      } catch (err) {
                                                                                                          console.error(err);
                                                                                                              return NextResponse.json({ error: 'DB error' }, { status: 500 });
                                                                                                                }
                                                                                                                }

                                                                                                                export async function DELETE(req: Request) {
                                                                                                                  const auth = requireAuth(req);
                                                                                                                    if (auth instanceof Response) return auth;

                                                                                                                      try {
                                                                                                                          const { rowIndex } = await req.json();
                                                                                                                              if (!rowIndex) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
                                                                                                                                  await sql`DELETE FROM patients WHERE id = ${rowIndex}`;
                                                                                                                                      return NextResponse.json({ success: true });
                                                                                                                                        } catch (err) {
                                                                                                                                            console.error(err);
                                                                                                                                                return NextResponse.json({ error: 'DB error' }, { status: 500 });
                                                                                                                                                  }
                                                                                                                                                  }