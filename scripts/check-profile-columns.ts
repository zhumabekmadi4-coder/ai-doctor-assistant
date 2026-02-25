import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('Fetching columns for "profiles"...')
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error fetching profiles:', error)
    } else {
        console.log('Sample data keys:', data.length > 0 ? Object.keys(data[0]) : 'No data yet')
    }

    // Attempt to list columns via rpc or just select a non-existent column to see error
    const { error: testError } = await supabase
        .from('profiles')
        .select('email')
        .limit(1)

    if (testError) {
        console.log('Email column check failed:', testError.message)
    } else {
        console.log('Email column exists!')
    }
}

check()
