import Redis from 'ioredis';
import { NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL);

/**
 * POST /api/health/nutrition
 *
 * Accepts a flat nutrition summary for a single date and stores it to
 * health:index for the Electron desktop app to pick up on its next sync.
 *
 * Body fields (all optional except `date`):
 *   date          — "YYYY-MM-DD"
 *   calories_kcal — total calories (kcal)
 *   carbs_g       — carbohydrates (g)
 *   protein_g     — protein (g)
 *   fat_g         — total fat (g)
 *   fiber_g       — dietary fiber (g)
 *   water_ml      — water intake (ml; accepts litres if ≤ 30 and converts)
 *   caffeine_mg   — caffeine (mg; accepts grams if ≤ 5 and converts)
 *   sugar_g       — sugar (g)
 *   sodium_mg     — sodium (mg)
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

  const date = String(body.date).slice(0, 10);

  // water_ml: if value ≤ 30 assume litres, convert to ml
  const rawWater = body.water_ml != null ? Number(body.water_ml) : null;
  const waterMl = rawWater != null ? (rawWater <= 30 ? rawWater * 1000 : rawWater) : undefined;

  // caffeine_mg: if value ≤ 5 assume grams, convert to mg
  const rawCaffeine = body.caffeine_mg != null ? Number(body.caffeine_mg) : null;
  const caffeineMg = rawCaffeine != null ? (rawCaffeine <= 5 ? rawCaffeine * 1000 : rawCaffeine) : undefined;

  const payload = {
    source: 'apple_shortcuts',
    date,
    ...(body.calories_kcal != null && { calories_kcal: Number(body.calories_kcal) }),
    ...(body.carbs_g       != null && { carbs_g:       Number(body.carbs_g) }),
    ...(body.protein_g     != null && { protein_g:     Number(body.protein_g) }),
    ...(body.fat_g         != null && { fat_g:         Number(body.fat_g) }),
    ...(body.fiber_g       != null && { fiber_g:       Number(body.fiber_g) }),
    ...(waterMl            != null && { water_ml:      waterMl }),
    ...(caffeineMg         != null && { caffeine_mg:   caffeineMg }),
    ...(body.sugar_g       != null && { sugar_g:       Number(body.sugar_g) }),
    ...(body.sodium_mg     != null && { sodium_mg:     Number(body.sodium_mg) }),
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
