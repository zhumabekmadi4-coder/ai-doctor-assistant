
import { getSheets, SPREADSHEET_ID } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const sheets = getSheets();
        if (!SPREADSHEET_ID) {
            throw new Error('Missing SPREADSHEET_ID');
        }

        // Read all rows from the first sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'A:K', // Columns: name, dob, visitDate, complaints, anamnesis, diagnosis, treatment, recommendations, doctorName, doctorSpecialty, timestamp
        });

        const rows = response.data.values || [];

        // Map rows to patient objects (skip header row if present)
        const patients = rows
            .filter(row => row[0] && row[0] !== 'ФИО пациента') // skip empty or header rows
            .map((row, index) => ({
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
            .reverse(); // Most recent first

        return NextResponse.json({ patients });

    } catch (error: any) {
        console.error('[API] Patients Error:', error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
