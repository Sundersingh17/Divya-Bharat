// Basic in-memory rate limiter — good enough to stop naive abuse and
// accidental double-submits during the free-tier testing phase.
//
// IMPORTANT LIMITATION: this only works within a single running server
// process. On serverless platforms (Vercel's default deploy), each
// invocation can run on a different instance with its own memory, so
// this does not provide a real guarantee at scale. Before a public
// launch with meaningful traffic, replace this with a shared store
// (e.g. Upstash Redis, which has a free tier) — see README.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  return true;
}

export function getClientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}

// Shared (cross-instance) limiter for the sensitive routes. Uses Upstash
// Redis over REST when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are
// set; otherwise it falls back to the in-memory limiter above (fine locally,
// weak on serverless). Fails OPEN on a Redis error so an outage can't block orders.
export async function rateLimitShared(key: string, limit: number, windowMs: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return rateLimit(key, limit, windowMs);
  try {
    const bucket = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", bucket], ["PEXPIRE", bucket, windowMs]])
    });
    if (!res.ok) return rateLimit(key, limit, windowMs);
    const out = await res.json();
    const count = Number(out?.[0]?.result);
    return !(isFinite(count) && count > limit);
  } catch {
    return rateLimit(key, limit, windowMs);
  }
}
