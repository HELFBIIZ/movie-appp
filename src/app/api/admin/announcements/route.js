// POST /api/admin/announcements — ADMIN/SUPER_ADMIN broadcast (e.g. new movie).
// Body: { title, body, link } — link must be an internal path.
import { NextResponse } from 'next/server';
import { requireRole, notifyAllUsers } from '../../../../db/index.mjs';
import { parseJsonBody, reqStr, optStr, all, badInput } from '../../../../lib/validate';
import { safeReturnTo } from '../../../../lib/safe-return';

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value;
  const { error } = await requireRole(token, 'ADMIN', 'SUPER_ADMIN');
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });

  const body = await parseJsonBody(request);
  const title = reqStr(body?.title?.trim?.(), { min: 3, max: 120 });
  const message = optStr(body?.body?.trim?.(), { max: 500 });
  const link = optStr(body?.link?.trim?.(), { max: 300 });
  const check = all(title, message, link);
  if (check.error) return badInput('Invalid announcement', check.error.field);

  const sent = await notifyAllUsers({
    type: 'new_movie',
    title: title.value,
    body: message.value,
    link: link.value ? safeReturnTo(link.value, '/movies') : '/movies',
  });
  return NextResponse.json({ ok: true, sent });
}
