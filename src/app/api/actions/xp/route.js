import { NextResponse } from 'next/server';
import { requireUser } from '../../../../db/index.mjs';
import { awardXp } from '../../../../lib/xp.mjs';
import { parseJsonBody, reqStr, oneOf, all, badInput } from '../../../../lib/validate';

const ALLOWED = new Set(['SUBTITLE_HELP', 'WORD_LEARNED']);

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value;
  const { user, error } = await requireUser(token);
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });

  const body = await parseJsonBody(request);
  const activity = oneOf(body?.activity, [...ALLOWED]);
  const key = reqStr(body?.key, { min: 1, max: 100 });
  const check = all(activity, key);
  if (check.error) return badInput('Invalid XP action', check.error.field);

  const day = new Date().toISOString().slice(0, 10);
  const cleanKey = key.value.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 80);
  const result = await awardXp({
    userId: user.id,
    activity: activity.value,
    eventKey: `${activity.value}:${user.id}:${cleanKey}:${day}`,
  });
  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 429 });
  }
  return NextResponse.json({ ok: true, gained: result.gained || 0, xp: result.xp });
}
