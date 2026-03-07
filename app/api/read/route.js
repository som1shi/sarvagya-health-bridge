import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET(request) {

  // ── AUTH ──────────────────────────────
  const authHeader = request.headers.get('Authorization');
  const expectedToken = process.env.HEALTH_SYNC_SECRET;

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // ── OPTIONAL: since parameter ─────────
  // Mac sends ?since={timestamp} to only fetch new entries
  const { searchParams } = new URL(request.url);
  const since = parseInt(searchParams.get('since') ?? '0');

  // ── FETCH KEYS FROM INDEX ─────────────
  // Get all keys newer than 'since' timestamp
  const keys = await kv.zrangebyscore(
    'health:index',
    since + 1,        // exclusive of last seen
    '+inf'
  );

  if (!keys || keys.length === 0) {
    return NextResponse.json({
      payloads: [],
      count: 0,
      latestTimestamp: since
    });
  }

  // ── FETCH ALL PAYLOADS ────────────────
  const rawPayloads = await Promise.all(
    keys.map(key => kv.get(key))
  );

  // Filter out expired/null entries
  const payloads = rawPayloads
    .filter(Boolean)
    .map(p => typeof p === 'string' ? JSON.parse(p) : p);

  // Extract latest timestamp from keys
  // Key format: health:{date}:{timestamp}
  const timestamps = keys.map(k => parseInt(k.split(':')[2]));
  const latestTimestamp = Math.max(...timestamps);

  return NextResponse.json({
    payloads,
    count: payloads.length,
    latestTimestamp
  });
}
