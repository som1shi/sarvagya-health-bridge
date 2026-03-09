import Redis from 'ioredis';
import { NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL);

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.HEALTH_SYNC_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since = parseInt(searchParams.get('since') ?? '0');

  // Count only batches the caller hasn't read yet
  const totalKeys = since > 0
    ? await redis.zcount('health:index', since + 1, '+inf')
    : await redis.zcard('health:index');

  return NextResponse.json({
    status: 'ok',
    totalPendingBatches: totalKeys,
    timestamp: new Date().toISOString()
  });
}
