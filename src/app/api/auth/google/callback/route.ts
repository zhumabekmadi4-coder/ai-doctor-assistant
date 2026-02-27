import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { signSession, signGoogleTemp } from '@/lib/auth';

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

    // Verify CSRF state (warn but don't block — Vercel serverless can lose cookies)
    const cookieHeader = req.headers.get('cookie') || '';
    const stateCookie = cookieHeader.split(';').find(c => c.trim().startsWith('_oauth_state='))?.split('=')[1]?.trim();
    if (!state || (stateCookie && state !== stateCookie)) {
        console.warn('[Google OAuth] State mismatch — state:', state, 'cookie:', stateCookie);
        return NextResponse.redirect(`${appUrl}/?auth_error=invalid_state`);
    }
    console.log('[Google OAuth] State ok, stateCookie:', stateCookie ? 'present' : 'missing');

    // Read flow mode from cookie
    const mode = cookieHeader.split(';').find(c => c.trim().startsWith('_oauth_mode='))?.split('=')[1]?.trim();
    // Check if this is a link-account flow
    const linkLogin = cookieHeader.split(';').find(c => c.trim().startsWith('_oauth_link_login='))?.split('=')[1]?.trim();

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
        const { id: googleId, email } = googleUser;

        if (!email) {
            return NextResponse.redirect(`${appUrl}/?auth_error=no_email`);
        }

        // ── Link mode: attach Google to existing account ──
        if (linkLogin) {
            const existing = await sql`SELECT login FROM users WHERE google_id = ${googleId} LIMIT 1`;
            if (existing.length > 0 && existing[0].login !== linkLogin) {
                const response = NextResponse.redirect(`${appUrl}/?auth_error=google_already_linked`);
                response.cookies.set('_oauth_link_login', '', { maxAge: 0, path: '/' });
                response.cookies.set('_oauth_state', '', { maxAge: 0, path: '/' });
                return response;
            }

            await sql`UPDATE users SET google_id = ${googleId}, email = ${email} WHERE login = ${linkLogin}`;

            const response = NextResponse.redirect(`${appUrl}/?google_linked=1`);
            response.cookies.set('_oauth_link_login', '', { maxAge: 0, path: '/' });
            response.cookies.set('_oauth_state', '', { maxAge: 0, path: '/' });
            return response;
        }

        // ── Register mode: new doctor signs up via Google ──
        if (mode === 'register') {
            // Check if this Google account is already registered
            const existing = await sql`SELECT login FROM users WHERE google_id = ${googleId} OR email = ${email} LIMIT 1`;
            if (existing.length > 0) {
                const response = NextResponse.redirect(`${appUrl}/?auth_error=already_registered`);
                response.cookies.set('_oauth_mode', '', { maxAge: 0, path: '/' });
                response.cookies.set('_oauth_state', '', { maxAge: 0, path: '/' });
                return response;
            }

            // Sign a short-lived temp token with Google data for the registration page
            const tempToken = signGoogleTemp({
                name: googleUser.name || '',
                email,
                googleId,
            });

            const response = NextResponse.redirect(
                `${appUrl}/register?token=${encodeURIComponent(tempToken)}&name=${encodeURIComponent(googleUser.name || '')}&email=${encodeURIComponent(email)}`
            );
            response.cookies.set('_oauth_mode', '', { maxAge: 0, path: '/' });
            response.cookies.set('_oauth_state', '', { maxAge: 0, path: '/' });
            return response;
        }

        // ── Login mode: find existing user by google_id or email ──
        const userRows = await sql`
            SELECT login, name, specialty, role, active
            FROM users
            WHERE google_id = ${googleId} OR (email = ${email} AND google_id IS NULL)
            LIMIT 1
        `;

        const user = userRows[0];

        if (!user) {
            // Account not found — tell the user to register first
            return NextResponse.redirect(`${appUrl}/?auth_error=not_registered`);
        }

        // Link google_id if it was matched by email only
        if (!user.google_id) {
            await sql`UPDATE users SET google_id = ${googleId} WHERE login = ${user.login}`;
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

        const response = NextResponse.redirect(`${appUrl}/`);
        response.cookies.set('_gsession', sessionToken, {
            httpOnly: false,
            maxAge: 86400,
            path: '/',
            sameSite: 'lax',
        });
        response.cookies.set('_guser', userData, {
            httpOnly: false,
            maxAge: 86400,
            path: '/',
            sameSite: 'lax',
        });
        response.cookies.set('_oauth_state', '', { maxAge: 0, path: '/' });

        return response;

    } catch (err: any) {
        console.error('[Google OAuth] Callback error:', err);
        return NextResponse.redirect(`${appUrl}/?auth_error=server_error`);
    }
}
