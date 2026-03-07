import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function POST(request) {

  // ── AUTH ──────────────────────────────
  const authHeader = request.headers.get('Authorization');
  const expectedToken = process.env.HEALTH_SYNC_SECRET;

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // ── PARSE ─────────────────────────────
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    );
  }

  // ── STORE ─────────────────────────────
  // Key by date + timestamp so multiple syncs per day don't overwrite
  // Format: health:{YYYY-MM-DD}:{timestamp}
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];
  const timestampKey = now.getTime();
  const storageKey = `health:${dateKey}:${timestampKey}`;

  await kv.set(storageKey, JSON.stringify(payload), {
    ex: 60 * 60 * 24 * 7   // expires after 7 days — transit buffer only
  });

  // Track all keys so the Mac can fetch them
  // Maintain a sorted set of keys by timestamp
  await kv.zadd('health:index', {
    score: timestampKey,
    member: storageKey
  });

  // Clean up index entries older than 7 days
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  await kv.zremrangebyscore('health:index', 0, sevenDaysAgo);

  return NextResponse.json({
    success: true,
    key: storageKey,
    recordedAt: now.toISOString()
  });
}
