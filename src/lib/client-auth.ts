/**
 * Client-side auth helpers.
 * Stores the signed session token and provides authenticated fetch.
 */

const TOKEN_KEY = 'sessionToken';

export function getSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

/**
 * Wrapper around fetch that automatically attaches the session token.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = getSessionToken();
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('x-session-token', token);
    }
    return fetch(url, { ...options, headers });
}
