import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/db/index.mjs';
import { checkWireReadiness } from '@/lib/wire-readiness';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (rateLimit(`wire-readiness:${ip}`, { max: 20 }).limited)
    return NextResponse.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 });
  try {
    return NextResponse.json(await checkWireReadiness(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: { code: 'WIRE_CHECK_UNAVAILABLE' } }, { status: 503 });
  }
}
