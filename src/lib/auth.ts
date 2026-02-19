import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;
const SESSION_SECRET = process.env.SESSION_SECRET || 'jazai-doc-secret-change-in-prod';

// ─── Password Hashing (bcrypt) ────────────────────────────

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    // If hash starts with '$2' it's bcrypt
    if (storedHash.startsWith('$2')) {
        return bcrypt.compare(password, storedHash);
    }
    // Legacy SHA-256 fallback for migration
    const sha256 = crypto.createHash('sha256').update(password).digest('hex');
    return sha256 === storedHash;
}

/**
 * Check if hash is legacy SHA-256 (needs re-hash to bcrypt).
 */
export function isLegacyHash(hash: string): boolean {
    return !hash.startsWith('$2');
}

// ─── Signed Session Token ─────────────────────────────────

export interface SessionPayload {
    login: string;
    role: string;
    name: string;
    // No PII or secrets — only identifiers
}

export function signSession(data: SessionPayload): string {
    const payload = JSON.stringify(data);
    const signature = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(payload)
        .digest('hex');
    return Buffer.from(JSON.stringify({ p: payload, s: signature })).toString('base64');
}

export function verifySession(token: string): SessionPayload | null {
    try {
        const { p: payload, s: signature } = JSON.parse(
            Buffer.from(token, 'base64').toString()
        );
        const expected = crypto
            .createHmac('sha256', SESSION_SECRET)
            .update(payload)
            .digest('hex');
        if (signature !== expected) return null;
        return JSON.parse(payload) as SessionPayload;
    } catch {
        return null;
    }
}

// ─── Request Helpers ──────────────────────────────────────

/**
 * Extract and verify user session from the request header.
 * Returns null if the session is invalid or missing.
 */
export function getUserFromRequest(req: Request): SessionPayload | null {
    const token = req.headers.get('x-session-token');
    if (!token) return null;
    return verifySession(token);
}

/**
 * Require authenticated user. Returns user or 401 response.
 */
export function requireAuth(req: Request): SessionPayload | Response {
    const user = getUserFromRequest(req);
    if (!user) {
        return new Response(JSON.stringify({ error: 'Не авторизован' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return user;
}

/**
 * Require admin role. Returns user or 403 response.
 */
export function requireAdmin(req: Request): SessionPayload | Response {
    const result = requireAuth(req);
    if (result instanceof Response) return result;
    if (result.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Доступ запрещён' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return result;
}
