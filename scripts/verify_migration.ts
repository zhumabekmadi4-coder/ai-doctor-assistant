import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load variables from .env.local
dotenv.config({ path: '.env.local' });

async function verifyMigration() {
    // Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase URL or Service Role Key in .env.local');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('Verifying migration results...');
    
    // Check patients count
    const { count: patientCount, error: patientError } = await supabaseAdmin
        .from('patients')
        .select('*', { count: 'exact', head: true });
        
    if (patientError) {
        console.error('Error counting patients:', patientError);
    } else {
        console.log(`Total patients in database: ${patientCount}`);
    }
    
    // Check templates count
    const { count: templateCount, error: templateError } = await supabaseAdmin
        .from('templates')
        .select('*', { count: 'exact', head: true });
        
    if (templateError) {
        console.error('Error counting templates:', templateError);
    } else {
        console.log(`Total templates in database: ${templateCount}`);
    }
    
    // Check last few patient records
    const { data: lastPatients, error: lastPatientError } = await supabaseAdmin
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
        
    if (lastPatientError) {
        console.error('Error fetching recent patients:', lastPatientError);
    } else {
        console.log('\nLast 5 patient records:');
        lastPatients.forEach((patient, index) => {
            console.log(`${index + 1}. ${patient.patient_name} - ${patient.visit_date || 'No date'} - Dr. ID: ${patient.doctor_id || 'None'}`);
        });
    }
    
    // Check last few template records
    const { data: lastTemplates, error: lastTemplateError } = await supabaseAdmin
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
        
    if (lastTemplateError) {
        console.error('Error fetching recent templates:', lastTemplateError);
    } else {
        console.log('\nLast 5 template records:');
        lastTemplates.forEach((template, index) => {
            console.log(`${index + 1}. ${template.title} - Category: ${template.category || 'No category'}`);
        });
    }
    
    console.log('\nVerification complete!');
}

verifyMigration()
    .then(() => {
        console.log('Verification process completed.');
        process.exit(0);
    })
    .catch(error => {
        console.error('Verification process failed:', error);
        process.exit(1);
    });