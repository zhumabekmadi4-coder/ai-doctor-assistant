import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

const WEEKLY_TOKENS = 15;

// POST /api/cron/weekly-reset
// Called every Monday at 00:00 UTC by Vercel Cron.
// Vercel automatically sends Authorization: Bearer <CRON_SECRET>.
export async function POST(req: Request) {
    const auth = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await sql`
            UPDATE users
            SET tokens_balance = ${WEEKLY_TOKENS},
                tokens_reset_at = NOW()
            WHERE active = true
            RETURNING login
        `;

        console.log(`[Cron] Weekly token reset: ${result.length} users reset to ${WEEKLY_TOKENS} tokens`);

        return NextResponse.json({
            success: true,
            resetCount: result.length,
            tokensPerUser: WEEKLY_TOKENS,
        });
    } catch (err: any) {
        console.error('[Cron] Weekly reset error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
