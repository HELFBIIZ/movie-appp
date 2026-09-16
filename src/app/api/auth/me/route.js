// GET /api/auth/me — resolves the session cookie (mn_session) and returns the
// authenticated user's public card: identity, role, XP profile, streak,
// recent transactions, active subscription, owned rewards. Never returns a
// hash or a token. Backs the /me page.
import { NextResponse } from 'next/server'
import {
  getUserBySessionToken, getXpProfile, listXpTransactions, getActiveSubscription, listMyRewards,
} from '../../../../lib/db.mjs'

const COOKIE_NAME = 'mn_session'

export async function GET(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value ?? null

  const user = token ? await getUserBySessionToken(token) : null
  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
  }

  const [profile, active] = await Promise.all([
    getXpProfile(user.id),
    getActiveSubscription(user.id),
  ])

  return NextResponse.json({
    me: {
      id: user.id,
      email: user.email,
      username: user.username,
      roleCode: user.roleCode,
      // flat keys (the /me page reads these directly)
      xp: profile.xp,
      level: profile.level,
      streakDays: profile.streakDays,
      bestStreak: profile.bestStreak,
      lastLoginDate: profile.lastLoginDate,
      // nested shape for the /pricing page + API consumers
      gamification: profile,
      transactions: await listXpTransactions(user.id, 8),
      subscription: active
        ? { planCode: active.planCode, planName: active.planName, priceMnt: active.priceMnt, expiresAt: active.expiresAt }
        : null,
      rewards: await listMyRewards(user.id),
    },
  })
}