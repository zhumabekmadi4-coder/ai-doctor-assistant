
import { google } from 'googleapis';

if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing Google Credentials');
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
});

export const sheets = google.sheets({ version: 'v4', auth });
export const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
