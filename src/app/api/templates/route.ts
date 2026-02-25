import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/templates — return own templates + all public templates
export async function GET(req: Request) {
    const auth = requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const data = await sql`
            SELECT * FROM templates
            WHERE doctor_login = ${auth.login}
               OR is_public = true
            ORDER BY
                CASE WHEN doctor_login = ${auth.login} THEN 0 ELSE 1 END,
                created_at DESC
        `;
        return NextResponse.json({ templates: data });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}

// POST /api/templates — create new template
export async function POST(req: Request) {
    const auth = requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const {
            name, description, headerText, content,
            complaints, anamnesis, diagnosis, treatment, recommendations,
            images, isPublic, authorName,
        } = await req.json();

        const result = await sql`
            INSERT INTO templates (
                doctor_login, name, description, header_text, content,
                complaints, anamnesis, diagnosis, treatment, recommendations,
                images, is_public, author_name, created_at, updated_at
            ) VALUES (
                ${auth.login},
                ${name},
                ${description ?? ''},
                ${headerText ?? name},
                ${content ?? recommendations ?? ''},
                ${complaints ?? ''},
                ${anamnesis ?? ''},
                ${diagnosis ?? ''},
                ${treatment ?? ''},
                ${recommendations ?? content ?? ''},
                ${JSON.stringify(images ?? [])},
                ${isPublic ?? false},
                ${authorName ?? auth.name ?? auth.login},
                NOW(),
                NOW()
            )
            RETURNING *
        `;
        return NextResponse.json({ template: result[0] });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}

// PATCH /api/templates — update own template
export async function PATCH(req: Request) {
    const auth = requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const {
            id, name, description, headerText, content,
            complaints, anamnesis, diagnosis, treatment, recommendations,
            images, isPublic,
        } = await req.json();

        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        await sql`
            UPDATE templates SET
                name            = ${name},
                description     = ${description ?? ''},
                header_text     = ${headerText ?? name},
                content         = ${content ?? recommendations ?? ''},
                complaints      = ${complaints ?? ''},
                anamnesis       = ${anamnesis ?? ''},
                diagnosis       = ${diagnosis ?? ''},
                treatment       = ${treatment ?? ''},
                recommendations = ${recommendations ?? content ?? ''},
                images          = ${JSON.stringify(images ?? [])},
                is_public       = ${isPublic ?? false},
                updated_at      = NOW()
            WHERE id = ${id} AND doctor_login = ${auth.login}
        `;
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}

// DELETE /api/templates — delete own template
export async function DELETE(req: Request) {
    const auth = requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        await sql`DELETE FROM templates WHERE id = ${id} AND doctor_login = ${auth.login}`;
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
