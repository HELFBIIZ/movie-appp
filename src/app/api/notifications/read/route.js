// POST /api/notifications/read — mark one, several ({ids:[]}) or ALL (empty
// body) notifications read. Owner-guarded via the session.
//   200 { ok, unread } · 401 UNAUTHENTICATED
import { NextResponse } from 'next/server';
import { requireUser, markNotificationsRead } from '../../../../db/index.mjs';
import { parseJsonBody } from '../../../../lib/validate';

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value;
  const { user, error } = await requireUser(token);
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });

  const body = await parseJsonBody(request).catch(() => ({}));
  if (body?.ids !== undefined) {
    if (
      !Array.isArray(body.ids) ||
      !body.ids.length ||
      !body.ids.every((i) => typeof i === 'string' && /^[a-f0-9-]{8,}$/i.test(i))
    ) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', field: 'ids' } }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      unread: await markNotificationsRead(user.id, body.ids.slice(0, 100)),
    });
  }
  return NextResponse.json({ ok: true, unread: await markNotificationsRead(user.id) });
}
