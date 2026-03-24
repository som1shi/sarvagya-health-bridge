import Redis from 'ioredis';
import { NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL);

/**
 * POST /api/health/sleep
 *
 * Two accepted shapes:
 *
 * 1. Raw stage segments (from Apple Shortcuts "Find Health Samples" action):
 *    {
 *      "segments": [
 *        { "start": "Mar 23, 2026 at 02:46", "value": "Core", "end": "Mar 23, 2026 at 03:06" },
 *        { "start": "Mar 23, 2026 at 03:06", "value": "Awake", "end": "Mar 23, 2026 at 03:07" },
 *        ...
 *      ]
 *    }
 *    `date` is optional here — it will be inferred from the last segment's end time.
 *
 * 2. Pre-aggregated flat summary (e.g. from a manual Shortcut or another source):
 *    {
 *      "date": "2026-03-23",
 *      "sleep_total_min": 420,
 *      "sleep_deep_min": 90,
 *      "sleep_rem_min": 100,
 *      ...
 *    }
 *
 * All fields except `date` (or `segments`) are optional.
 */
export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.HEALTH_SYNC_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Normalise segments: accept a proper JSON array OR a newline-delimited string
  // of JSON objects (what Apple Shortcuts produces when you join items as text)
  let segments = null;
  if (Array.isArray(body.segments)) {
    segments = body.segments;
  } else if (typeof body.segments === 'string' && body.segments.trim()) {
    segments = body.segments
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
  }

  const hasSegments = segments && segments.length > 0;
  const hasDate = body.date;

  if (!hasSegments && !hasDate) {
    return NextResponse.json(
      { error: 'Provide either `segments` or a `date` with flat fields' },
      { status: 400 },
    );
  }

  const date = hasDate ? String(body.date).slice(0, 10) : undefined;

  const payload = {
    source: 'apple_shortcuts',
    ...(date && { date }),
    ...(hasSegments && { sleep_segments: segments }),
    // flat summary fields (used when no segments are present)
    ...(body.sleep_total_min        != null && { sleep_total_min:        Number(body.sleep_total_min) }),
    ...(body.sleep_asleep_min       != null && { sleep_asleep_min:       Number(body.sleep_asleep_min) }),
    ...(body.sleep_deep_min         != null && { sleep_deep_min:         Number(body.sleep_deep_min) }),
    ...(body.sleep_rem_min          != null && { sleep_rem_min:          Number(body.sleep_rem_min) }),
    ...(body.sleep_core_min         != null && { sleep_core_min:         Number(body.sleep_core_min) }),
    ...(body.sleep_awake_min        != null && { sleep_awake_min:        Number(body.sleep_awake_min) }),
    ...(body.sleep_efficiency_pct   != null && { sleep_efficiency_pct:   Number(body.sleep_efficiency_pct) }),
    ...(body.sleep_hrv_avg          != null && { sleep_hrv_avg:          Number(body.sleep_hrv_avg) }),
    ...(body.sleep_respiratory_rate != null && { sleep_respiratory_rate: Number(body.sleep_respiratory_rate) }),
    ...(body.sleep_hours            != null && { sleep_hours:            Number(body.sleep_hours) }),
  };

  const now = new Date();
  const timestampKey = now.getTime();
  const dateForKey = date ?? now.toISOString().slice(0, 10);
  const storageKey = `health:${dateForKey}:${timestampKey}`;

  await redis.set(storageKey, JSON.stringify(payload), 'EX', 60 * 60 * 24 * 7);
  await redis.zadd('health:index', timestampKey, storageKey);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  await redis.zremrangebyscore('health:index', 0, sevenDaysAgo);

  return NextResponse.json({ success: true, key: storageKey, recordedAt: now.toISOString() });
}
