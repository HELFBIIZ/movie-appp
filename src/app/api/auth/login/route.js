// POST /api/auth/login
// Server-verified credential check (scrypt, timing-safe) → new httpOnly session
// → streak flip + DAILY_LOGIN XP + a security-log line, all server-side.
import { NextResponse } from 'next/server'
import {
  findUserForLogin, verifySecret, createSession, buildSessionCookie, rateLimit, logSecurity,
} from '../../../../lib/db.mjs'
import { flipLoginStreak, awardXp } from '../../../../lib/xp.mjs'

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const rl = rateLimit(`login:${ip}`, { max: 8 })
  if (rl.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', retryAfterSeconds: rl.retryAfterSeconds } },
      { status: 429 }
    )
  }

  let body
  try { body = await request.json() } catch { body = {} }
  const { identifier, password } = body ?? {}

  if (!identifier || typeof password !== 'string' || !password) {
    return NextResponse.json({ error: { code: 'MISSING_CREDENTIALS' } }, { status: 400 })
  }

  const user = await findUserForLogin(identifier)
  if (!user || !verifySecret(user.passwordHash, password)) {
    return NextResponse.json({ error: { code: 'INVALID_CREDENTIALS' } }, { status: 401 })
  }

  const session = await createSession(user.id)
  if (session.error) {
    return NextResponse.json({ error: { code: session.error.code } }, { status: 500 })
  }

  // Gamification + audit wiring: one streak flip and DAILY_LOGIN award per day
  // (both internally rate-limited/idempotent), then a security log entry.
  const streak = await flipLoginStreak({ userId: user.id })
  const daily = await awardXp({ userId: user.id, activity: 'DAILY_LOGIN' })
  await logSecurity({ userId: user.id, type: 'login-success', detail: `session ${session.token ? 'issued' : 'failed'} from ${ip}`, ip })

  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, username: user.username, roleId: user.roleId },
    xp: { gained: daily.gained ?? 0, status: daily.error?.code ?? 'ok' },
    streak,
  })
  response.headers.set('Set-Cookie', buildSessionCookie(session.token, session.expiresAt))
  return response
}
