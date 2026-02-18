import { getSheets, SPREADSHEET_ID } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';


export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const sheets = getSheets();

        // Get users from the "Users" sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID!,
            range: 'Users!A:F',
        });

        const rows = response.data.values || [];
        // Row format: [login, password_hash, name, specialty, role, active]
        // Skip header row (index 0)
        const userRow = rows.slice(1).find(
            (row) => row[0]?.toLowerCase() === username.trim().toLowerCase()
        );

        if (!userRow) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const [login, storedHash, name, specialty, role, active] = userRow;

        if (active?.toLowerCase() === 'false') {
            return NextResponse.json({ error: 'Account disabled' }, { status: 403 });
        }

        const inputHash = hashPassword(password);
        if (inputHash !== storedHash) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        return NextResponse.json({
            success: true,
            user: { login, name, specialty, role },
        });
    } catch (err) {
        console.error('Auth error:', err);
        return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
    }
}
