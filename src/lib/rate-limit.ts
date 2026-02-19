/**
 * Rate limiter — in-memory, per-key.
 * Limits repeated requests (e.g. login attempts) by IP or username.
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.resetTime) store.delete(key);
    }
}, 10 * 60 * 1000);

/**
 * Check if the key is within rate limit.
 * @returns `true` if allowed, `false` if blocked.
 */
export function checkRateLimit(
    key: string,
    maxAttempts = 5,
    windowMs = 15 * 60 * 1000 // 15 min
): boolean {
    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetTime) {
        store.set(key, { count: 1, resetTime: now + windowMs });
        return true;
    }

    if (record.count >= maxAttempts) {
        return false;
    }

    record.count++;
    return true;
}
