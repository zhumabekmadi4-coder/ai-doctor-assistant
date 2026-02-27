import { NextResponse } from 'next/server';
import crypto from 'crypto';

// GET /api/auth/google — initiates Google OAuth flow
// Optional query param: ?link_login=<login> to link Google to existing account
// Optional query param: ?mode=register for new registration flow
export async function GET(req: Request) {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    if (!clientId) {
        return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const linkLogin = searchParams.get('link_login');
    const mode = searchParams.get('mode'); // 'register' | null (login by default)

    // Encode mode into the state param so it survives the OAuth redirect
    // even if cookies are lost (Vercel serverless issue).
    // Format: "<random_hex>:<mode>" or just "<random_hex>" for login.
    const random = crypto.randomBytes(16).toString('hex');
    const stateValue = mode === 'register' ? `${random}:register` : random;

    const redirectUri = `${appUrl}/api/auth/google/callback`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state: stateValue,
        access_type: 'online',
        prompt: 'select_account',
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Store state in a short-lived cookie for CSRF verification (best-effort)
    const response = NextResponse.redirect(url);
    response.cookies.set('_oauth_state', stateValue, {
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
