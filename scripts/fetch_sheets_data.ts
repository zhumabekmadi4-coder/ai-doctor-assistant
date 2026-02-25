import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load variables from .env.local
dotenv.config({ path: '.env.local' });

// We need a script to read from Google Sheets and dump to JSON or directly to Supabase
// Since we don't have Supabase Service Role Key yet, we will just read the data first.

async function main() {
    const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY
                ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
                : undefined,
        },
        scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // 1. Fetch Users
    console.log('Fetching Users...');
    const usersRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Users!A:G',
    });
    const users = usersRes.data.values || [];
    console.log(`Found ${users.length - 1} users.`);
    users.slice(1).forEach(row => {
        console.log(`- ${row[0]} (${row[1]})`);
    });

    // 2. Fetch Templates
    console.log('\nFetching Templates...');
    const templatesRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Templates!A:C', // Increased range just in case
    });
    const templates = templatesRes.data.values || [];
    console.log(`Found ${templates.length - 1} templates.`);
    templates.slice(1, 6).forEach(row => {
        console.log(`- ${row[0]} | ${row[1]} | ${row[2]}`);
    });
}

main().catch(console.error);
