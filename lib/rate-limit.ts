import { NextRequest } from 'next/server';
const store = new Map<string, { count: number; reset: number }>();

export function rateLimit(request: NextRequest, options: {
  limit: number;
  windowMs: number;
}): { success: boolean; remaining: number } {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'anonymous';
  const key = ip;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + options.windowMs });
    return { success: true, remaining: options.limit - 1 };
  }

  if (entry.count >= options.limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: options.limit - entry.count };
}
