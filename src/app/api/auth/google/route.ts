import { NextResponse } from 'next/server';
import crypto from 'crypto';

// GET /api/auth/google — initiates Google OAuth flow
// Optional query param: ?link_login=<login> to link Google to existing account
export async function GET(req: Request) {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    if (!clientId) {
        return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const linkLogin = searchParams.get('link_login');

    // Generate a random state value to prevent CSRF
    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'online',
        prompt: 'select_account',
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Store state in a short-lived cookie for CSRF verification
    const response = NextResponse.redirect(url);
    response.cookies.set('_oauth_state', state, {
        httpOnly: true,
        maxAge: 300, // 5 minutes
        path: '/',
        sameSite: 'lax',
    });

    // If linking mode, store the login to link in a cookie
    if (linkLogin) {
        response.cookies.set('_oauth_link_login', linkLogin, {
            httpOnly: true,
            maxAge: 300,
            path: '/',
            sameSite: 'lax',
        });
    }

    return response;
}
