import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load variables from .env.local
dotenv.config({ path: '.env.local' });

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

    // Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase URL or Service Role Key in .env.local');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('Starting migration from Google Sheets to Supabase...');
    
    // 1. Fetch Users to build doctor mapping
    console.log('Fetching Users to build doctor mapping...');
    const { data: profiles, error: profilesError } = await supabaseAdmin.from('profiles').select('id, email, full_name, clinic_id');
    if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
    }

    const doctorMap = new Map();
    for (const p of profiles) {
        if (p.email) doctorMap.set(p.email.toLowerCase(), p);
        if (p.full_name) doctorMap.set(p.full_name.toLowerCase(), p);
    }

    console.log(`Found ${doctorMap.size} doctor profiles in Supabase.`);

    // 2. Fetch Patients from Sheets
    console.log('Fetching Patients from Sheets...');
    const patientsRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'A:K',
    });

    const patientRows = patientsRes.data.values || [];
    console.log(`Found ${patientRows.length - 1} patients. Migrating...`);

    let patientsMigrated = 0;
    let patientsFailed = 0;

    // Skip header row
    for (let i = 1; i < patientRows.length; i++) {
        const row = patientRows[i];

        // Skip empty rows
        if (!row[0] || row[0] === 'ФИО пациента') continue;

        try {
            const doctorLogin = row[8] ? String(row[8]).toLowerCase().trim() : null;

            let doctorId = null;
            let clinicId = null;
            if (doctorLogin && doctorMap.has(doctorLogin)) {
                const doc = doctorMap.get(doctorLogin);
                doctorId = doc.id;
                clinicId = doc.clinic_id;
            }

            const patientData = {
                patient_name: row[0] || null,
                dob: row[1] || null,
                visit_date: row[2] || null,
                complaints: row[3] || null,
                anamnesis: row[4] || null,
                diagnosis: row[5] || null,
                treatment: row[6] || null,
                recommendations: row[7] || null,
                doctor_id: doctorId,
                clinic_id: clinicId,
                created_at: row[10] ? new Date(row[10]).toISOString() : new Date().toISOString()
            };

            console.log(`Inserting patient: ${patientData.patient_name}`);
            
            const { error } = await supabaseAdmin.from('patients').insert(patientData);
            if (error) {
                console.error(`Error inserting patient: ${patientData.patient_name}`, error);
                patientsFailed++;
            } else {
                patientsMigrated++;
                console.log(`Successfully inserted patient: ${patientData.patient_name}`);
            }
        } catch (error) {
            console.error(`Unexpected error processing row ${i}:`, error);
            patientsFailed++;
        }
    }
    
    console.log(`✅ Successfully migrated ${patientsMigrated} patients to Supabase.`);
    console.log(`❌ Failed to migrate ${patientsFailed} patients.`);
    
    // Now handle templates migration
    console.log('\n--- Starting Templates Migration ---');
    
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

    console.log('\n--- Migration Complete ---');
}

main()
    .then(() => {
        console.log('Migration process completed successfully.');
        process.exit(0);
    })
    .catch(error => {
        console.error('Migration process failed:', error);
        process.exit(1);
    });