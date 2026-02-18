import crypto from 'crypto';

export function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Verify that the request has a valid session header.
 * For MVP, checks X-User-Login header (set by client).
 * In production, should use JWT or session tokens.
 */
export function getUserFromRequest(req: Request): { login: string; role: string } | null {
    const sessionHeader = req.headers.get('x-user-session');
    if (!sessionHeader) return null;
    try {
        const parsed = JSON.parse(sessionHeader);
        if (!parsed.login) return null;
        return { login: parsed.login, role: parsed.role || 'doctor' };
    } catch {
        return null;
    }
}
