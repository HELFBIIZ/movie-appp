// POST /api/auth/register
// Server-side truth: scrypt-hashed credential, XP SIGNUP grant, session.
// Returns { user: {id,email,username,roleId} } + sets httpOnly session cookie.
// Client can NEVER see the hash; client tells us zero security facts.
import { NextResponse } from 'next/server'
import {
  createUser, createSession, buildSessionCookie, rateLimit,
} from '../../../../lib/db.mjs'

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const rl = rateLimit(`register:${ip}`, { max: 6 })
  if (rl.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', retryAfterSeconds: rl.retryAfterSeconds } },
      { status: 429 }
    )
  }

  let body
  try { body = await request.json() } catch { body = {} }
  const { email, username, password } = body ?? {}

  const result = await createUser({ email, username, password })
  if (result.error) {
    const statusMap = {
      INVALID_EMAIL: 400, INVALID_USERNAME: 400, WEAK_PASSWORD: 400,
      EMAIL_TAKEN: 409, USERNAME_TAKEN: 409,
    }
    return NextResponse.json({ error: { code: result.error } }, { status: statusMap[result.error] || 400 })
  }

  const session = await createSession(result.user.id)
  if (session.error) {
    return NextResponse.json({ error: { code: session.error.code } }, { status: 500 })
  }

  const response = NextResponse.json(
    { ok: true, user: { id: result.user.id, email: result.user.email, username: result.user.username, roleId: result.user.roleId }, xp: result.xp }
  )
  response.headers.set('Set-Cookie', buildSessionCookie(session.token, session.expiresAt))
  return response
}
