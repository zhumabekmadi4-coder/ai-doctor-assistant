import { SPREADSHEET_ID } from '@/lib/google-sheets';
import { getClinicCredits, getClinicIdForUser } from '@/lib/clinic';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/credits?login=username — returns credit balance for user's clinic
export async function GET(req: Request) {
    const auth = requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const login = searchParams.get('login');

        if (!login) {
            return NextResponse.json({ error: 'Missing login parameter' }, { status: 400 });
        }

        if (!SPREADSHEET_ID) {
            throw new Error('Missing SPREADSHEET_ID');
        }

        const clinicId = await getClinicIdForUser(SPREADSHEET_ID, login);

        if (!clinicId) {
            return NextResponse.json({
                clinicName: 'Без клиники',
                totalCredits: -1,
                usedCredits: 0,
                remainingCredits: -1,
                unlimited: true,
            });
        }

        const credits = await getClinicCredits(clinicId);
        return NextResponse.json({ ...credits, unlimited: false });

    } catch (error: unknown) {
        console.error('[API] Credits Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
