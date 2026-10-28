// In-memory sliding-window rate limiter. Adequate for a single Node instance; swap for a
// Redis-backed limiter (e.g. Upstash) before running multiple server instances.

const buckets = new Map<string, { count: number; resetAt: number }>();

const MAX = Number(process.env.RATE_LIMIT_MAX ?? 60);
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);

export function rateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX - 1 };
  }

  if (bucket.count >= MAX) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: MAX - bucket.count };
}

export function clientKeyFromRequest(req: Request, suffix = ''): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return `${ip}:${suffix}`;
}
