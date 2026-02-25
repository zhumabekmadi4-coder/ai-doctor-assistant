import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load variables from .env.local
dotenv.config({ path: '.env.local' });

async function migrateTemplatesOnly() {
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

    // Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase URL or Service Role Key in .env.local');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('Starting templates migration from Google Sheets to Supabase...');
    
    // Fetch Templates from Sheets
    console.log('Fetching Templates from Sheets...');
    const templatesRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Templates!A:C',
    });

    const templateRows = templatesRes.data.values || [];
    console.log(`Found ${templateRows.length - 1} templates. Migrating...`);

    let templatesMigrated = 0;
    let templatesFailed = 0;

    // Skip header row
    for (let i = 1; i < templateRows.length; i++) {
        const row = templateRows[i];

        // Skip empty rows
        if (!row[0]) continue;

        try {
            const templateData = {
                title: row[0] || null,
                category: row[1] || null,
                content: row[2] || null,
                created_at: new Date().toISOString()
            };

            console.log(`Inserting template: ${templateData.title}`);
            
            const { error } = await supabaseAdmin.from('templates').insert(templateData);
            if (error) {
                console.error(`Error inserting template: ${templateData.title}`, error);
                templatesFailed++;
            } else {
                templatesMigrated++;
                console.log(`Successfully inserted template: ${templateData.title}`);
            }
        } catch (error) {
            console.error(`Unexpected error processing template row ${i}:`, error);
            templatesFailed++;
        }
    }
    
    console.log(`✅ Successfully migrated ${templatesMigrated} templates to Supabase.`);
    console.log(`❌ Failed to migrate ${templatesFailed} templates.`);

    console.log('\n--- Templates Migration Complete ---');
}

migrateTemplatesOnly()
    .then(() => {
        console.log('Templates migration process completed.');
        process.exit(0);
    })
    .catch(error => {
        console.error('Templates migration process failed:', error);
        process.exit(1);
    });