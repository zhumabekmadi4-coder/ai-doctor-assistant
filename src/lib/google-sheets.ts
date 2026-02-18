import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getPrivateKey(): string {
    const key = process.env.GOOGLE_PRIVATE_KEY;
    if (!key) throw new Error('Missing GOOGLE_PRIVATE_KEY');

    // Vercel stores env vars differently depending on how they were entered:
    // 1. If entered with literal \n → need to replace \\n with \n
    // 2. If entered with real newlines → already correct
    // This handles both cases:
    return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key;
}

// Lazy initialization — only runs at request time, not at build time
export function getSheets() {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        throw new Error('Missing Google Credentials');
    }
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: getPrivateKey(),
        },
        scopes: SCOPES,
    });
    return google.sheets({ version: 'v4', auth });
}

export const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
