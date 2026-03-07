import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.HEALTH_SYNC_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const totalKeys = await kv.zcard('health:index');

  return NextResponse.json({
    status: 'ok',
    totalPendingBatches: totalKeys,
    timestamp: new Date().toISOString()
  });
}
