import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { signSession } from '@/lib/auth';

// GET /api/auth/google/callback — handles Google OAuth callback
export async function GET(req: Request) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // User denied access
    if (error) {
        return NextResponse.redirect(`${appUrl}/?auth_error=denied`);
    }

    if (!code) {
        return NextResponse.redirect(`${appUrl}/?auth_error=no_code`);
    }

    // Verify CSRF state
    const cookieHeader = req.headers.get('cookie') || '';
    const stateCookie = cookieHeader.split(';').find(c => c.trim().startsWith('_oauth_state='))?.split('=')[1]?.trim();
    if (!state || state !== stateCookie) {
        return NextResponse.redirect(`${appUrl}/?auth_error=invalid_state`);
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    try {
        // Exchange code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }).toString(),
        });

        if (!tokenRes.ok) {
            console.error('[Google OAuth] Token exchange failed:', await tokenRes.text());
            return NextResponse.redirect(`${appUrl}/?auth_error=token_failed`);
        }

        const { access_token } = await tokenRes.json();

        // Get user info from Google
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        if (!userInfoRes.ok) {
            return NextResponse.redirect(`${appUrl}/?auth_error=userinfo_failed`);
        }

        const googleUser = await userInfoRes.json();
        const { id: googleId, email, name: displayName } = googleUser;

        if (!email) {
            return NextResponse.redirect(`${appUrl}/?auth_error=no_email`);
        }

        // Find or create user
        let userRows = await sql`
            SELECT login, name, specialty, role, active
            FROM users
            WHERE google_id = ${googleId} OR (email = ${email} AND google_id IS NULL)
            LIMIT 1
        `;

        let user = userRows[0];

        if (!user) {
            // Create new doctor account
            // Derive login from email prefix, ensure uniqueness
            const baseLogin = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
            let login = baseLogin;
            let attempt = 0;
            while (attempt < 10) {
                const existing = await sql`SELECT 1 FROM users WHERE login = ${login}`;
                if (existing.length === 0) break;
                attempt++;
                login = `${baseLogin}_${attempt}`;
            }

            const newRows = await sql`
                INSERT INTO users (login, password_hash, name, email, google_id, role, active, tokens_balance)
                VALUES (${login}, '', ${displayName || login}, ${email}, ${googleId}, 'doctor', true, 15)
                RETURNING login, name, specialty, role, active
            `;
            user = newRows[0];
        } else {
            // Update google_id if missing (linking existing account by email)
            if (!user.google_id) {
                await sql`UPDATE users SET google_id = ${googleId} WHERE login = ${user.login}`;
            }
        }

        if (!user.active) {
            return NextResponse.redirect(`${appUrl}/?auth_error=account_disabled`);
        }

        // Generate session token
        const sessionToken = signSession({
            login: user.login,
            role: user.role || 'doctor',
            name: user.name || '',
        });

        // Encode user data for client
        const userData = btoa(JSON.stringify({
            login: user.login,
            name: user.name || '',
            specialty: user.specialty || '',
            role: user.role || 'doctor',
        }));

        // Set session cookies and redirect
        const response = NextResponse.redirect(`${appUrl}/`);
        response.cookies.set('_gsession', sessionToken, {
            httpOnly: false,
            maxAge: 60,
            path: '/',
            sameSite: 'lax',
        });
        response.cookies.set('_guser', userData, {
            httpOnly: false,
            maxAge: 60,
            path: '/',
            sameSite: 'lax',
        });
        // Clear CSRF cookie
        response.cookies.set('_oauth_state', '', { maxAge: 0, path: '/' });

        return response;

    } catch (err: any) {
        console.error('[Google OAuth] Callback error:', err);
        return NextResponse.redirect(`${appUrl}/?auth_error=server_error`);
    }
}
