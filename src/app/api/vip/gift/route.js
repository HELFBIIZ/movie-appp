import { NextResponse } from 'next/server';
import { requireUser, rateLimit, giftVipDays } from '../../../../db/index.mjs';

export async function POST(request) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });

  const rl = rateLimit(`vip-gift:${user.id}`, { max: 10 });
  if (rl.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', retryAfterSeconds: rl.retryAfterSeconds } },
      { status: 429 },
    );
  }

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_BODY' } }, { status: 400 });
  }
  const result = await giftVipDays({
    senderId: user.id,
    recipient: payload.recipient,
    days: payload.days,
  });
  if (result.error) {
    const status = result.error.code === 'XP_INSUFFICIENT' ? 402 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, ...result });
}
