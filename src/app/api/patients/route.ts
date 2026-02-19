
import { getSheets, SPREADSHEET_ID } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
    const auth = requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const sheets = getSheets();
        if (!SPREADSHEET_ID) {
            throw new Error('Missing SPREADSHEET_ID');
        }

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'A:K',
        });

        const rows = response.data.values || [];

        const patients = rows
            .map((row, index) => ({
                rowIndex: index + 1, // 1-based index for Google Sheets
                id: index,
                patientName: row[0] || '',
                dob: row[1] || '',
                visitDate: row[2] || '',
                complaints: row[3] || '',
                anamnesis: row[4] || '',
                diagnosis: row[5] || '',
                treatment: row[6] || '',
                recommendations: row[7] || '',
                doctorName: row[8] || '',
                doctorSpecialty: row[9] || '',
                savedAt: row[10] || '',
            }))
            .filter(p => p.patientName && p.patientName !== 'ФИО пациента')
            .reverse();

        return NextResponse.json({ patients });

    } catch (error: unknown) {
        console.error('[API] Patients Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const auth = requireAuth(req);
    if (auth instanceof Response) return auth;

    try {
        const { rowIndex } = await req.json();

        if (!rowIndex || typeof rowIndex !== 'number' || rowIndex < 2) {
            return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
        }

        const sheets = getSheets();
        if (!SPREADSHEET_ID) throw new Error('Missing SPREADSHEET_ID');

        // Delete the row (rowIndex - 1 because API is 0-indexed for start/end)
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: 0, // Assuming first sheet
                                dimension: 'ROWS',
                                startIndex: rowIndex - 1,
                                endIndex: rowIndex,
                            },
                        },
                    },
                ],
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('[API] Delete Patient Error:', error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
