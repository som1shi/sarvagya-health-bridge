import Redis from 'ioredis';
import { NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL);

/**
 * POST /api/health/activity
 *
 * Body fields (all optional except `date`):
 *   date           — "YYYY-MM-DD"
 *   steps          — step count (sum for the day)
 *   active_calories — active energy burned (kcal, sum for the day)
 *   exercise_min   — Apple exercise time (minutes, sum for the day)
 *   stand_hours    — stand hours completed (count for the day)
 *   distance_km    — walking + running distance (km, sum for the day)
 *   floors_climbed — flights climbed (sum for the day)
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

  if (!body.date) {
    return NextResponse.json({ error: 'Missing date' }, { status: 400 });
  }

  // Expect plain YYYY-MM-DD formatted in local time from Shortcuts
  const date = String(body.date).slice(0, 10);

  const payload = {
    source: 'apple_shortcuts',
    date,
    ...(body.steps           != null && { steps:           Number(body.steps) }),
    ...(body.active_calories != null && { active_calories: Number(body.active_calories) }),
    ...(body.exercise_min    != null && { exercise_min:    Number(body.exercise_min) }),
    ...(body.stand_minutes   != null && { stand_minutes:   Number(body.stand_minutes) }),
    ...(body.distance_km     != null && { distance_km:     Number(body.distance_km) }),
    ...(body.floors_climbed  != null && { floors_climbed:  Number(body.floors_climbed) }),
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
