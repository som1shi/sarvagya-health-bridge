import Redis from 'ioredis';
import { NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL);

// POST /api/gym/upload
// Body: { name, performedAt, notes?, sets: [{ exerciseName, setNumber, reps, weightKg }] }
export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  const expectedToken = process.env.HEALTH_SYNC_SECRET;

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!payload.name || !Array.isArray(payload.sets)) {
    return NextResponse.json({ error: 'Missing required fields: name, sets' }, { status: 400 });
  }

  const now = new Date();
  const timestampKey = now.getTime();
  const storageKey = `gym:${timestampKey}`;

  await redis.set(storageKey, JSON.stringify(payload), 'EX', 60 * 60 * 24 * 30); // 30-day TTL
  await redis.zadd('gym:index', timestampKey, storageKey);

  // Prune entries older than 30 days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  await redis.zremrangebyscore('gym:index', 0, thirtyDaysAgo);

  return NextResponse.json({ success: true, key: storageKey, recordedAt: now.toISOString() });
}
