// GET /api/notifications — the bell poll. Returns the recipient's list + unread
// count. Requires a session; never leaks another user's notifications.
//   200 { ok, unread, notifications:[{id,type,title,body,link,readAt,createdAt}] }
//   401 UNAUTHENTICATED
import { NextResponse } from 'next/server'
import { requireUser, listNotifications, unreadNotificationsCount } from '../../../lib/db.mjs'

export async function GET(request) {
  const token = request.cookies.get('mn_session')?.value
  const { user, error } = await requireUser(token)
  if (error) return NextResponse.json({ error }, { status: error.status || 401 })

  const unreadOnly = request.nextUrl.searchParams.get('unread') === '1'
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '30', 10), 100)
  return NextResponse.json({
    ok: true,
    unread: await unreadNotificationsCount(user.id),
    notifications: await listNotifications(user.id, { unreadOnly, limit }),
  })
}