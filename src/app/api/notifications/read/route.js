// POST /api/notifications/read — mark one, several ({ids:[]}) or ALL (empty
// body) notifications read. Owner-guarded via the session.
//   200 { ok, unread } · 401 UNAUTHENTICATED
import { NextResponse } from 'next/server'
import { requireUser, markNotificationsRead } from '../../../../lib/db.mjs'
import { parseJsonBody } from '../../../../lib/validate.mjs'

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value
  const { user, error } = await requireUser(token)
  if (error) return NextResponse.json({ error }, { status: error.status || 401 })

  const body = await parseJsonBody(request).catch(() => ({}))
  const ids =
    Array.isArray(body?.ids) &&
    body.ids.every((i) => typeof i === 'string' && /^[a-f0-9-]{8,}$/i.test(i))
      ? body.ids.slice(0, 100)
      : null
  return NextResponse.json({ ok: true, unread: await markNotificationsRead(user.id, ids) })
}