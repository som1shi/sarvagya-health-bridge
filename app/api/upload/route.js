import Redis from 'ioredis';
import { NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL);

export async function POST(request) {

  // ── AUTH ──────────────────────────────
  const authHeader = request.headers.get('Authorization');
  const expectedToken = process.env.HEALTH_SYNC_SECRET;

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── PARSE ─────────────────────────────
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ── STORE ─────────────────────────────
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];
  const timestampKey = now.getTime();
  const storageKey = `health:${dateKey}:${timestampKey}`;

  await redis.set(storageKey, JSON.stringify(payload), 'EX', 60 * 60 * 24 * 7);
  await redis.zadd('health:index', timestampKey, storageKey);

  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  await redis.zremrangebyscore('health:index', 0, sevenDaysAgo);

  return NextResponse.json({
    success: true,
    key: storageKey,
    recordedAt: now.toISOString()
  });
}
