import { getSheets, SPREADSHEET_ID } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';

// POST /api/setup-users — one-time setup to create Users sheet and admin account
// Requires env vars: ADMIN_LOGIN, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_SPECIALTY
export async function POST() {
    try {
        const adminLogin = process.env.ADMIN_LOGIN;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminName = process.env.ADMIN_NAME || 'Admin';
        const adminSpecialty = process.env.ADMIN_SPECIALTY || '';

        if (!adminLogin || !adminPassword) {
            return NextResponse.json(
                { error: 'Missing ADMIN_LOGIN or ADMIN_PASSWORD env vars' },
                { status: 400 }
            );
        }

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
            range: 'Users!A1:G1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [['login', 'password_hash', 'name', 'specialty', 'role', 'active', 'clinic_id']],
            },
        });

        // 3. Add admin user (bcrypt hash)
        const adminHash = await hashPassword(adminPassword);
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID!,
            range: 'Users!A:G',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[adminLogin, adminHash, adminName, adminSpecialty, 'admin', 'true', SPREADSHEET_ID || '']],
            },
        });

        return NextResponse.json({
            success: true,
            message: `Users sheet created. Admin: ${adminLogin}`,
        });
    } catch (err) {
        console.error('Setup error:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
