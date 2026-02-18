import { getSheets, SPREADSHEET_ID } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/setup-users — one-time setup to create Users sheet and admin account
// Call this once after deployment: POST /api/setup-users
export async function POST() {
    try {
        const sheets = getSheets();

        // 1. Create the "Users" sheet if it doesn't exist
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID!,
        });

        const sheetExists = spreadsheet.data.sheets?.some(
            (s) => s.properties?.title === 'Users'
        );

        if (!sheetExists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID!,
                requestBody: {
                    requests: [
                        {
                            addSheet: {
                                properties: { title: 'Users' },
                            },
                        },
                    ],
                },
            });
        }

        // 2. Add header row
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID!,
            range: 'Users!A1:F1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [['login', 'password_hash', 'name', 'specialty', 'role', 'active']],
            },
        });

        // 3. Add admin user (zhuma_md / Ituteg777)
        const adminHash = hashPassword('Ituteg777');
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID!,
            range: 'Users!A:F',
            valueInputOption: 'RAW',
            requestBody: {
                values: [['zhuma_md', adminHash, 'Мади Жума', 'Невролог', 'admin', 'true']],
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Users sheet created. Admin: zhuma_md / Ituteg777',
        });
    } catch (err) {
        console.error('Setup error:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
