import { getSheets, SPREADSHEET_ID } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';
import { verifyPassword, isLegacyHash, hashPassword, signSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
    try {
        // Rate limiting by IP
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        if (!checkRateLimit(`auth:${ip}`, 5, 15 * 60 * 1000)) {
            return NextResponse.json(
                { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
                { status: 429 }
            );
        }

        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const sheets = getSheets();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID!,
            range: 'Users!A:F',
        });

        const rows = response.data.values || [];
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

        // Verify password (supports both bcrypt and legacy SHA-256)
        const isValid = await verifyPassword(password, storedHash);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Auto-migrate legacy SHA-256 hash to bcrypt
        if (isLegacyHash(storedHash)) {
            try {
                const newHash = await hashPassword(password);
                const rowIndex = rows.findIndex(
                    (row, i) => i > 0 && row[0]?.toLowerCase() === login.toLowerCase()
                );
                if (rowIndex > 0) {
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID!,
                        range: `Users!B${rowIndex + 1}`,
                        valueInputOption: 'RAW',
                        requestBody: { values: [[newHash]] },
                    });
                }
            } catch (err) {
                console.warn('Failed to auto-migrate hash:', err);
                // Non-critical — login still succeeds
            }
        }

        // Create signed session token (no PII/secrets inside)
        const token = signSession({ login, role: role || 'doctor', name: name || '' });

        return NextResponse.json({
            success: true,
            user: { login, name, specialty, role },
            token,
        });
    } catch (err) {
        console.error('Auth error:', err);
        return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
    }
}
