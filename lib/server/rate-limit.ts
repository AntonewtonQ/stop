import "server-only";

/**
 * Fixed-window rate limiter kept in memory.
 *
 * On serverless platforms each instance keeps its own counters, so this is a
 * best-effort abuse brake (bots hammering one instance), not a global quota.
 * Swap `checkRateLimit` for a shared store (e.g. Upstash Redis) if a hard
 * global limit is ever required.
 */

export type RateLimitRule = {
  name: string;
  limit: number;
  windowMs: number;
};

type Bucket = { count: number; resetAt: number };

const MAX_TRACKED_KEYS = 10_000;

const globalLimiter = globalThis as typeof globalThis & {
  jogastopRateLimitBuckets?: Map<string, Bucket>;
};

function getBuckets() {
  globalLimiter.jogastopRateLimitBuckets ??= new Map<string, Bucket>();
  return globalLimiter.jogastopRateLimitBuckets;
}

function sweep(buckets: Map<string, Bucket>, now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  rule: Pick<RateLimitRule, "limit" | "windowMs">,
  now = Date.now(),
) {
  const buckets = getBuckets();
  if (buckets.size > MAX_TRACKED_KEYS) sweep(buckets, now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + rule.windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  return {
    allowed: bucket.count <= rule.limit,
    retryAfterMs: Math.max(0, bucket.resetAt - now),
  };
}

export function resetRateLimits() {
  getBuckets().clear();
}

const MINUTE = 60_000;

export const RATE_LIMITS = {
  // Create/join are keyed by IP. Angolan mobile carriers use CGNAT, so many
  // players can share one address: keep these limits generous.
  createRoom: { name: "create-room", limit: 30, windowMs: MINUTE },
  joinRoom: { name: "join-room", limit: 90, windowMs: MINUTE },
  // Keyed by player id. Answers autosave while typing, hence the budget.
  roomAction: { name: "room-action", limit: 240, windowMs: MINUTE },
  voiceToken: { name: "voice-token", limit: 20, windowMs: MINUTE }, // per player
} satisfies Record<string, RateLimitRule>;
