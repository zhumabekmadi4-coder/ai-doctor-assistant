import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        console.log('Testing create user for', email);
        const supabaseAdmin = createAdminClient();

        console.log('Got admin client, inserting...');
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError) {
            console.error('Auth Error Details:', authError);
            return NextResponse.json({ error: 'Auth Error', details: authError }, { status: 500 });
        }

        return NextResponse.json({ success: true, user: authData.user.id });
    } catch (err: any) {
        console.error('Crash in debug route:', err);
        return NextResponse.json({ error: 'Crash', message: err.message, stack: err.stack }, { status: 500 });
    }
}
