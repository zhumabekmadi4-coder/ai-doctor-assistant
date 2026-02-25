import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

// POST /api/import-templates — import templates from localStorage JSON export
//
// Accepts two formats:
//   1. { "doctor_login": [ ...templates ] }   ← format from localStorage export
//   2. [ ...templates ]                        ← flat array
//
// Each template object:
//   { name, description, headerText, content, images, isPublic, authorLogin, authorName,
//     complaints, anamnesis, diagnosis, treatment, recommendations, createdAt, updatedAt }

export async function POST(req: Request) {
    const auth = requireAdmin(req);
    if (auth instanceof Response) return auth;

    try {
        const body = await req.json();

        // Normalize to flat array
        let templatesList: any[] = [];
        if (Array.isArray(body)) {
            templatesList = body;
        } else if (typeof body === 'object') {
            for (const [doctorLogin, templates] of Object.entries(body)) {
                if (Array.isArray(templates)) {
                    for (const t of templates as any[]) {
                        templatesList.push({ ...t, authorLogin: t.authorLogin ?? doctorLogin });
                    }
                }
            }
        }

        if (templatesList.length === 0) {
            return NextResponse.json({ error: 'No templates found in request body' }, { status: 400 });
        }

        let migrated = 0;
        let skipped = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const t of templatesList) {
            const authorLogin = t.authorLogin ?? auth.login;
            const templateName = t.name ?? 'Без названия';

            // Skip if template with same name already exists for this doctor
            const existing = await sql`
                SELECT id FROM templates
                WHERE name = ${templateName} AND doctor_login = ${authorLogin}
                LIMIT 1
            `;

            if (existing.length > 0) {
                skipped++;
                continue;
            }

            try {
                const images = Array.isArray(t.images) ? t.images : [];

                await sql`
                    INSERT INTO templates (
                        doctor_login, name, description, header_text, content,
                        complaints, anamnesis, diagnosis, treatment, recommendations,
                        images, is_public, author_name, created_at, updated_at
                    ) VALUES (
                        ${authorLogin},
                        ${templateName},
                        ${t.description ?? ''},
                        ${t.headerText ?? templateName},
                        ${t.content ?? t.recommendations ?? ''},
                        ${t.complaints ?? ''},
                        ${t.anamnesis ?? ''},
                        ${t.diagnosis ?? ''},
                        ${t.treatment ?? ''},
                        ${t.recommendations ?? t.content ?? ''},
                        ${JSON.stringify(images)},
                        ${t.isPublic ?? false},
                        ${t.authorName ?? authorLogin},
                        ${t.createdAt ? new Date(t.createdAt) : new Date()},
                        ${t.updatedAt ? new Date(t.updatedAt) : new Date()}
                    )
                `;
                migrated++;
            } catch (err: any) {
                failed++;
                errors.push(`"${templateName}": ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            total: templatesList.length,
            migrated,
            skipped,
            failed,
            errors,
            summary: `Импортировано: ${migrated}, пропущено (уже есть): ${skipped}, ошибок: ${failed}`,
        });
    } catch (err: any) {
        console.error('import-templates error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
