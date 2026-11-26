import { NextResponse } from 'next/server';
import {
  requireUser,
  rateLimit,
  getReferralCode,
  claimReferral,
  listReferrals,
} from '../../../db/index.mjs';

export async function GET(request) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });
  return NextResponse.json({ referral: await listReferrals(user.id) });
}

export async function POST(request) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });

  const rl = rateLimit(`referral:${user.id}`, { max: 10 });
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
  const result = await claimReferral({ userId: user.id, code: payload.code });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, ...result, code: await getReferralCode(user.id) });
}
