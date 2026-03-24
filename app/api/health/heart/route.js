import Redis from 'ioredis';
import { NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL);

/**
 * POST /api/health/heart
 *
 * Accepts a flat cardiovascular summary for a single date and stores it to
 * health:index for the Electron desktop app to pick up on its next sync.
 *
 * Body fields (all optional except `date`):
 *   date             — "YYYY-MM-DD"
 *   resting_hr       — resting heart rate (bpm)
 *   hrv_sdnn         — HRV SDNN (ms)  [alias: hrv]
 *   hrv_rmssd        — HRV RMSSD (ms)
 *   avg_hr           — average heart rate (bpm)
 *   max_hr           — max heart rate (bpm)
 *   systolic         — systolic blood pressure (mmHg)
 *   diastolic        — diastolic blood pressure (mmHg)
 *   vo2_max          — VO2 max (ml/kg/min)
 *   o2_saturation    — blood oxygen saturation (% — accepts 0-1 or 0-100)
 *   respiratory_rate — breaths per minute
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

  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: 'Missing or invalid date (expected YYYY-MM-DD)' }, { status: 400 });
  }

  const payload = {
    source: 'apple_shortcuts',
    date: body.date,
    ...(body.resting_hr       != null && { resting_hr:       Number(body.resting_hr) }),
    // accept both hrv_sdnn and legacy hrv alias
    ...(body.hrv_sdnn         != null && { hrv_sdnn:         Number(body.hrv_sdnn) }),
    ...(body.hrv              != null && { hrv:              Number(body.hrv) }),
    ...(body.hrv_rmssd        != null && { hrv_rmssd:        Number(body.hrv_rmssd) }),
    ...(body.avg_hr           != null && { avg_hr:           Number(body.avg_hr) }),
    ...(body.max_hr           != null && { max_hr:           Number(body.max_hr) }),
    ...(body.systolic         != null && { systolic:         Number(body.systolic) }),
    ...(body.diastolic        != null && { diastolic:        Number(body.diastolic) }),
    ...(body.vo2_max          != null && { vo2_max:          Number(body.vo2_max) }),
    ...(body.o2_saturation    != null && { o2_saturation:    Number(body.o2_saturation) }),
    ...(body.respiratory_rate != null && { respiratory_rate: Number(body.respiratory_rate) }),
  };

  const now = new Date();
  const timestampKey = now.getTime();
  const storageKey = `health:${body.date}:${timestampKey}`;

  await redis.set(storageKey, JSON.stringify(payload), 'EX', 60 * 60 * 24 * 7);
  await redis.zadd('health:index', timestampKey, storageKey);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  await redis.zremrangebyscore('health:index', 0, sevenDaysAgo);

  return NextResponse.json({ success: true, key: storageKey, recordedAt: now.toISOString() });
}
