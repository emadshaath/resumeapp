// Simple in-memory rate limiter for serverless
// For production, use Upstash Redis or Vercel KV

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: limit - record.count };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60_000);
