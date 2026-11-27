import { NextResponse } from 'next/server';
import { requireRole } from '../../../../db/index.mjs';
import { awardXp } from '../../../../lib/xp.mjs';
import { parseJsonBody, reqStr, intBetween, optStr, all, badInput } from '../../../../lib/validate';

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value;
  const { error } = await requireRole(token, 'ADMIN', 'SUPER_ADMIN');
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });

  const body = await parseJsonBody(request);
  const userId = reqStr(body?.userId, { min: 8, max: 64, pattern: /^[a-zA-Z0-9-]+$/ });
  const amount = intBetween(body?.amount, { min: -500, max: 500 });
  const reason = optStr(body?.reason?.trim?.(), { max: 200 });
  const check = all(userId, amount, reason);
  if (check.error || !amount.value)
    return badInput('Invalid XP adjustment', check.error?.field ?? 'amount');

  const result = await awardXp({
    userId: userId.value,
    activity: 'ADMIN_ADJUST',
    amount: amount.value,
  });
  if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, xp: result.xp, level: result.level });
}
