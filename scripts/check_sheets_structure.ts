import { google } from 'googleapis';
import * as dotenv from 'dotenv';

// Load variables from .env.local
dotenv.config({ path: '.env.local' });

async function checkSheetsStructure() {
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

    console.log('Checking Google Sheets structure...');
    
    try {
        // Get spreadsheet metadata to see all sheet titles
        const response = await sheets.spreadsheets.get({
            spreadsheetId,
            fields: 'sheets.properties.title,sheets.properties.sheetId'
        });
        
        console.log('Available sheets in the spreadsheet:');
        response.data.sheets?.forEach((sheet, index) => {
            console.log(`${index + 1}. ${sheet.properties?.title} (ID: ${sheet.properties?.sheetId})`);
        });
        
        // Try to fetch data from the main sheet to see its structure
        console.log('\nTrying to fetch from main sheet (A:K)...');
        const mainSheetData = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A:K',
        });
        
        const rows = mainSheetData.data.values || [];
        console.log(`Main sheet has ${rows.length} rows and ${(rows[0] || []).length} columns`);
        
        if (rows.length > 0) {
            console.log('Header row:', rows[0]);
        }
        
        // Let's try to find if there's a different name for the templates sheet
        console.log('\nLooking for possible template sheets...');
        for (const sheet of response.data.sheets || []) {
            const title = sheet.properties?.title;
            if (title) {
                try {
                    console.log(`Checking sheet: ${title}`);
                    const sheetData = await sheets.spreadsheets.values.get({
                        spreadsheetId,
                        range: `${title}!A:C`,
                    });
                    
                    const sheetRows = sheetData.data.values || [];
                    if (sheetRows.length > 0) {
                        console.log(`  Found ${sheetRows.length} rows in '${title}' sheet`);
                        if (sheetRows[0]) {
                            console.log(`  Header: [${sheetRows[0].join(', ')}]`);
                        }
                    }
                } catch (error) {
                    console.log(`  Could not access sheet '${title}':`, error instanceof Error ? error.message : 'Unknown error');
                }
            }
        }
    } catch (error) {
        console.error('Error checking sheets structure:', error);
    }
}

checkSheetsStructure()
    .then(() => {
        console.log('Structure check completed.');
        process.exit(0);
    })
    .catch(error => {
        console.error('Structure check failed:', error);
        process.exit(1);
    });