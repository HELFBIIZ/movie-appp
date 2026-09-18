import { NextResponse } from 'next/server'
import {
  requireRole, listUsers, revokeUserSubscriptions, setUserDeleted, getUserRoleByUserId,
} from '../../../../lib/db.mjs'
import { parseJsonBody, reqStr, oneOf, all, badInput } from '../../../../lib/validate.mjs'

export async function GET(request) {
  const token = request.cookies.get('mn_session')?.value
  const { user, error } = await requireRole(token, 'ADMIN', 'SUPER_ADMIN')
  if (error) return NextResponse.json({ error }, { status: error.status || 401 })

  const search = request.nextUrl.searchParams.get('search') || ''
  const includeDeleted = request.nextUrl.searchParams.get('includeDeleted') === '1'
  return NextResponse.json({
    ok: true,
    users: await listUsers({ search, includeDeleted }),
    actor: { id: user.id, roleCode: user.roleCode },
  })
}

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value
  const { user, error } = await requireRole(token, 'ADMIN', 'SUPER_ADMIN')
  if (error) return NextResponse.json({ error }, { status: error.status || 401 })

  const body = await parseJsonBody(request)
  const userId = reqStr(body?.userId, { min: 8, max: 64, pattern: /^[a-zA-Z0-9-]+$/ })
  const action = oneOf(body?.action, ['revoke_vip', 'ban', 'restore'])
  const check = all(userId, action)
  if (check.error) return badInput('userId + action required', check.error.field)

  const target = await getUserRoleByUserId(userId.value)
  if (!target) return NextResponse.json({ error: { code: 'USER_NOT_FOUND' } }, { status: 404 })
  if (target.id === user.id) {
    return NextResponse.json({ error: { code: 'SELF_ACTION_DENIED' } }, { status: 403 })
  }
  if (['ADMIN', 'SUPER_ADMIN'].includes(target.roleCode) && user.roleCode !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: { code: 'SUPER_ADMIN_REQUIRED' } }, { status: 403 })
  }

  if (action.value === 'revoke_vip') {
    return NextResponse.json({
      ok: true,
      result: await revokeUserSubscriptions({ userId: userId.value, reviewedBy: user.id }),
    })
  }

  const result = await setUserDeleted({
    userId: userId.value,
    deleted: action.value === 'ban',
    reviewedBy: user.id,
  })
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.error.status || 404 })
  return NextResponse.json({ ok: true, result })
}
