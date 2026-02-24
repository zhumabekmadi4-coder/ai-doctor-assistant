import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/templates - get all templates for current user
export async function GET(req: Request) {
      const auth = requireAuth(req);
        if (auth instanceof Response) return auth;

          try {
                const data = await sql`SELECT * FROM templates WHERE doctor_login = ${auth.login} ORDER BY created_at DESC`;
                    return NextResponse.json({ templates: data });
          } catch (err) {
                console.error(err);
                    return NextResponse.json({ error: 'DB error' }, { status: 500 });
          }
}

// POST /api/templates - create new template
export async function POST(req: Request) {
      const auth = requireAuth(req);
        if (auth instanceof Response) return auth;

          try {
                const { name, complaints, anamnesis, diagnosis, treatment, recommendations } = await req.json();
                    const result = await sql`
                          INSERT INTO templates (doctor_login, name, complaints, anamnesis, diagnosis, treatment, recommendations)
                                VALUES (${auth.login}, ${name}, ${complaints ?? ''}, ${anamnesis ?? ''}, ${diagnosis ?? ''}, ${treatment ?? ''}, ${recommendations ?? ''})
                                      RETURNING *
                                          `;
                                              return NextResponse.json({ template: result[0] });
          } catch (err) {
                console.error(err);
                    return NextResponse.json({ error: 'DB error' }, { status: 500 });
          }
}

// PATCH /api/templates - update template
export async function PATCH(req: Request) {
      const auth = requireAuth(req);
        if (auth instanceof Response) return auth;

          try {
                const { id, name, complaints, anamnesis, diagnosis, treatment, recommendations } = await req.json();
                    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
                        await sql`
                              UPDATE templates SET
                                      name=${name}, complaints=${complaints ?? ''}, anamnesis=${anamnesis ?? ''},
                                              diagnosis=${diagnosis ?? ''}, treatment=${treatment ?? ''}, recommendations=${recommendations ?? ''}
                                                    WHERE id=${id} AND doctor_login=${auth.login}
                                                        `;
                                                            return NextResponse.json({ success: true });
          } catch (err) {
                console.error(err);
                    return NextResponse.json({ error: 'DB error' }, { status: 500 });
          }
}

// DELETE /api/templates - delete template
export async function DELETE(req: Request) {
      const auth = requireAuth(req);
        if (auth instanceof Response) return auth;

          try {
                const { id } = await req.json();
                    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
                        await sql`DELETE FROM templates WHERE id=${id} AND doctor_login=${auth.login}`;
                            return NextResponse.json({ success: true });
          } catch (err) {
                console.error(err);
                    return NextResponse.json({ error: 'DB error' }, { status: 500 });
          }
}