import Redis from 'ioredis';
import { NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL);

export async function GET(request) {

  // ── AUTH ──────────────────────────────
  const authHeader = request.headers.get('Authorization');
  const expectedToken = process.env.HEALTH_SYNC_SECRET;

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── OPTIONAL: since parameter ─────────
  const { searchParams } = new URL(request.url);
  const since = parseInt(searchParams.get('since') ?? '0');

  // ── FETCH KEYS FROM INDEX ─────────────
  const keys = await redis.zrangebyscore('health:index', since + 1, '+inf');

  if (!keys || keys.length === 0) {
    return NextResponse.json({ payloads: [], count: 0, latestTimestamp: since });
  }

  // ── FETCH ALL PAYLOADS ────────────────
  const rawValues = await redis.mget(...keys);

  const payloads = rawValues
    .filter(Boolean)
    .map(v => JSON.parse(v));

  const timestamps = keys.map(k => parseInt(k.split(':')[2]));
  const latestTimestamp = Math.max(...timestamps);

  return NextResponse.json({ payloads, count: payloads.length, latestTimestamp });
}
