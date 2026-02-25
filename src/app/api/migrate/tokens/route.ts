import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/migrate/tokens
// One-time migration to add token columns to users table.
// Protected by MIGRATION_SECRET header.
export async function POST(req: Request) {
    const secret = req.headers.get('x-migration-secret');
    if (!secret || secret !== process.env.MIGRATION_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_balance INT NOT NULL DEFAULT 15`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT`;

        // Add unique constraint on google_id (only for non-null values)
        await sql`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_indexes
                    WHERE tablename = 'users' AND indexname = 'users_google_id_unique'
                ) THEN
                    CREATE UNIQUE INDEX users_google_id_unique ON users (google_id) WHERE google_id IS NOT NULL;
                END IF;
            END $$
        `;

        // Set tokens_reset_at for existing users
        await sql`UPDATE users SET tokens_reset_at = NOW() WHERE tokens_reset_at IS NULL`;

        return NextResponse.json({
            success: true,
            message: 'Migration complete: tokens_balance, tokens_reset_at, email, google_id columns added',
        });
    } catch (err: any) {
        console.error('Migration error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
