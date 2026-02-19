import { getSheets, SPREADSHEET_ID } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';
import { hashPassword, requireAdmin } from '@/lib/auth';

// GET /api/users — list all users (admin only)
export async function GET(req: Request) {
    const auth = requireAdmin(req);
    if (auth instanceof Response) return auth;

    try {
        const sheets = getSheets();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID!,
            range: 'Users!A:F',
        });

        const rows = response.data.values || [];
        const users = rows.slice(1).map((row, index) => ({
            rowIndex: index + 2,
            login: row[0] || '',
            name: row[2] || '',
            specialty: row[3] || '',
            role: row[4] || 'doctor',
            active: row[5] !== 'false',
        }));

        return NextResponse.json({ users });
    } catch (err) {
        console.error('Get users error:', err);
        return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
    }
}

// POST /api/users — create new user (admin only)
export async function POST(req: Request) {
    const auth = requireAdmin(req);
    if (auth instanceof Response) return auth;

    try {
        const { login, password, name, specialty, role } = await req.json();

        if (!login || !password || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const sheets = getSheets();
        const passwordHash = await hashPassword(password);

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID!,
            range: 'Users!A:F',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[login.trim().toLowerCase(), passwordHash, name, specialty || '', role || 'doctor', 'true']],
            },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Create user error:', err);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

// DELETE /api/users — deactivate user by login (admin only)
export async function DELETE(req: Request) {
    const auth = requireAdmin(req);
    if (auth instanceof Response) return auth;

    try {
        const { login } = await req.json();
        if (!login) return NextResponse.json({ error: 'Missing login' }, { status: 400 });

        const sheets = getSheets();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID!,
            range: 'Users!A:F',
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(
            (row, i) => i > 0 && row[0]?.toLowerCase() === login.toLowerCase()
        );

        if (rowIndex === -1) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID!,
            range: `Users!F${rowIndex + 1}`,
            valueInputOption: 'RAW',
            requestBody: { values: [['false']] },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Delete user error:', err);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
