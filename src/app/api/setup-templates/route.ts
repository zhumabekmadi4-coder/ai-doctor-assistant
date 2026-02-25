import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

// POST /api/setup-templates - Create or update templates table schema in Neon
// Run once after deploying to add new columns
export async function POST(req: Request) {
    const auth = requireAdmin(req);
    if (auth instanceof Response) return auth;

    try {
        // Create table with full schema if it doesn't exist
        await sql`
            CREATE TABLE IF NOT EXISTS templates (
                id          SERIAL PRIMARY KEY,
                doctor_login TEXT NOT NULL,
                name         TEXT NOT NULL,
                description  TEXT DEFAULT '',
                header_text  TEXT DEFAULT '',
                content      TEXT DEFAULT '',
                complaints   TEXT DEFAULT '',
                anamnesis    TEXT DEFAULT '',
                diagnosis    TEXT DEFAULT '',
                treatment    TEXT DEFAULT '',
                recommendations TEXT DEFAULT '',
                images       JSONB DEFAULT '[]',
                is_public    BOOLEAN DEFAULT false,
                author_name  TEXT DEFAULT '',
                created_at   TIMESTAMP DEFAULT NOW(),
                updated_at   TIMESTAMP DEFAULT NOW()
            )
        `;

        // Add missing columns if table already existed with old schema
        const alterStmts = [
            sql`ALTER TABLE templates ADD COLUMN IF NOT EXISTS description   TEXT DEFAULT ''`,
            sql`ALTER TABLE templates ADD COLUMN IF NOT EXISTS header_text   TEXT DEFAULT ''`,
            sql`ALTER TABLE templates ADD COLUMN IF NOT EXISTS content       TEXT DEFAULT ''`,
            sql`ALTER TABLE templates ADD COLUMN IF NOT EXISTS images        JSONB DEFAULT '[]'`,
            sql`ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_public     BOOLEAN DEFAULT false`,
            sql`ALTER TABLE templates ADD COLUMN IF NOT EXISTS author_name   TEXT DEFAULT ''`,
            sql`ALTER TABLE templates ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP DEFAULT NOW()`,
        ];

        await Promise.all(alterStmts);

        // Back-fill header_text and content from existing data
        await sql`
            UPDATE templates
            SET
                header_text = COALESCE(NULLIF(header_text, ''), name),
                content     = COALESCE(NULLIF(content, ''), recommendations, ''),
                author_name = COALESCE(NULLIF(author_name, ''), doctor_login),
                updated_at  = COALESCE(updated_at, created_at, NOW())
            WHERE header_text = '' OR content = '' OR author_name = '' OR updated_at IS NULL
        `;

        return NextResponse.json({
            success: true,
            message: 'Templates table schema updated successfully',
        });
    } catch (err) {
        console.error('setup-templates error:', err);
        return NextResponse.json({ error: 'Setup failed', details: String(err) }, { status: 500 });
    }
}
