import Redis from 'ioredis';
import { NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL);

/**
 * POST /api/health/body
 *
 * Accepts a flat body composition summary for a single date and stores it to
 * health:index for the Electron desktop app to pick up on its next sync.
 *
 * Body fields (all optional except `date`):
 *   date          — "YYYY-MM-DD"
 *   weight_kg     — body weight (kg; accepts lbs if unit='lbs' or value > 150)
 *   weight_lbs    — body weight in lbs (auto-converts to kg)
 *   bmi           — body mass index
 *   body_fat_pct  — body fat percentage (accepts 0-1 or 0-100)
 *   lean_mass_kg  — lean body mass (kg)
 *   waist_cm      — waist circumference (cm)
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

  // Resolve weight: prefer weight_kg, fall back to weight_lbs converted, or detect unit
  let weightKg = body.weight_kg != null ? Number(body.weight_kg) : null;
  if (weightKg == null && body.weight_lbs != null) {
    weightKg = Number(body.weight_lbs) * 0.453592;
  }
  // If weight looks like lbs (> 150 kg is unrealistic for most people) and unit flag set
  if (weightKg != null && body.unit === 'lbs') {
    weightKg = weightKg * 0.453592;
  }

  const payload = {
    source: 'apple_shortcuts',
    date: body.date,
    ...(weightKg          != null && { weight_kg:    weightKg }),
    ...(body.bmi          != null && { bmi:          Number(body.bmi) }),
    ...(body.body_fat_pct != null && { body_fat_pct: Number(body.body_fat_pct) }),
    ...(body.lean_mass_kg != null && { lean_mass_kg: Number(body.lean_mass_kg) }),
    ...(body.waist_cm     != null && { waist_cm:     Number(body.waist_cm) }),
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
