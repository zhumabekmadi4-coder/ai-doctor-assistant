
import { getSheets, SPREADSHEET_ID } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
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

        // Prepare row data
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
                new Date().toISOString() // Timestamp
            ]
        ];

        // Append to first sheet — try 'Лист1' for Russian locale, fallback approach
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'A1', // Using just A1 targets the first sheet regardless of name
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values,
            },
        });

        return NextResponse.json({ success: true, data: response.data });

    } catch (error: any) {
        console.error('[API] Sheets Error Details:', error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
