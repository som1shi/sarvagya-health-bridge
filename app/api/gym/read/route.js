import Redis from 'ioredis';
import { NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL);

// GET /api/gym/read?since=<unixMs>
// Returns workouts uploaded after `since` timestamp.
export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  const expectedToken = process.env.HEALTH_SYNC_SECRET;

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since = parseInt(searchParams.get('since') ?? '0');

  const keys = await redis.zrangebyscore('gym:index', since + 1, '+inf');

  if (!keys || keys.length === 0) {
    return NextResponse.json({ workouts: [], count: 0, latestTimestamp: since });
  }

  const rawValues = await redis.mget(...keys);
  const workouts = rawValues.filter(Boolean).map(v => JSON.parse(v));
  const timestamps = keys.map(k => parseInt(k.split(':')[1]));
  const latestTimestamp = Math.max(...timestamps);

  return NextResponse.json({ workouts, count: workouts.length, latestTimestamp });
}
