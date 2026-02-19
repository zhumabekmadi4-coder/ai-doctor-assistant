
import { getSheets, SPREADSHEET_ID } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';
import { getClinicIdForUser, hasCredits, decrementCredit } from '@/lib/clinic';
import { requireAuth } from '@/lib/auth';

export async function POST(req: Request) {
    const auth = requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const sheets = getSheets();
        const body = await req.json();
        const {
            patientName,
            dob,
            visitDate,
            complaints,
            anamnesis,
            diagnosis,
            treatment,
            recommendations,
            doctor
        } = body;

        if (!SPREADSHEET_ID) {
            throw new Error('Missing SPREADSHEET_ID');
        }

        // Use verified login from session token (not client-supplied)
        const doctorLogin = auth.login;
        let clinicSheetId: string | null = null;

        if (doctorLogin) {
            clinicSheetId = await getClinicIdForUser(SPREADSHEET_ID, doctorLogin);

            if (clinicSheetId) {
                const canSave = await hasCredits(clinicSheetId);
                if (!canSave) {
                    return NextResponse.json(
                        { error: 'Кредиты консультаций закончились. Обратитесь к администратору.' },
                        { status: 403 }
                    );
                }
            }
        }

        const targetSheetId = clinicSheetId || SPREADSHEET_ID;

        const values = [
            [
                patientName,
                dob,
                visitDate,
                complaints,
                anamnesis,
                diagnosis,
                treatment,
                recommendations,
                doctor?.name || '',
                doctor?.specialty || '',
                new Date().toISOString()
            ]
        ];

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: targetSheetId,
            range: 'A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values,
            },
        });

        let remainingCredits = -1;
        if (clinicSheetId) {
            remainingCredits = await decrementCredit(clinicSheetId);
        }

        return NextResponse.json({
            success: true,
            data: response.data,
            remainingCredits,
        });

    } catch (error: unknown) {
        console.error('[API] Sheets Error Details:', error);
        const errorMessage = error instanceof Error
            ? error.message
            : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
