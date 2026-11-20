// POST /api/actions/redeem — spend XP on a reward (XP shop).
// Requires authentication. Calls db.mjs#redeemReward which is one atomic
// batch: deducts XP, logs the negative transaction, records the redemption,
// and materialises a VIP pass immediately for `feature` rewards.
//
//   200 { ok, reward, xpBalance, subscription? }
//   401 UNAUTHENTICATED · 400 INVALID_INPUT · 404 UNKNOWN_REWARD ·
//   409 REWARD_INACTIVE | REWARD_OWNED | XP_INSUFFICIENT
import { NextResponse } from 'next/server'
import { requireUser, rateLimit, redeemReward } from '../../../../lib/db.mjs'
import { parseJsonBody, reqStr, badInput } from '../../../../lib/validate.mjs'

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value
  const { user, error: authError } = await requireUser(token)
  if (authError) return NextResponse.json({ error: authError }, { status: authError.status || 401 })

  const rl = rateLimit(`redeem:${user.id}`, { max: 10 })
  if (rl.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', retryAfterSeconds: rl.retryAfterSeconds } },
      { status: 429 }
    )
  }

  const body = await parseJsonBody(request)
  const code = reqStr(body?.rewardCode, { min: 2, max: 64, pattern: /^[A-Z][A-Z0-9_]*$/ })
  if (!code.ok) return badInput('rewardCode must be a valid reward code', 'rewardCode')

  const result = await redeemReward({ userId: user.id, code: body.rewardCode, ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null })

  if (result.error) {
    const statusMap = {
      UNKNOWN_REWARD: 404,
      REWARD_INACTIVE: 409,
      REWARD_OWNED: 409,
      XP_INSUFFICIENT: 409,
    }
    return NextResponse.json({ error: { code: result.error.code, ...result.error } }, { status: statusMap[result.error.code] || 400 })
  }

  return NextResponse.json({
    ok: true,
    reward: result.reward,
    xpBalance: result.xpBalance,
    subscription: result.subscription || null,
  })
}
