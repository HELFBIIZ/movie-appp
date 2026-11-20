// GET /api/rewards — XP shop catalog + the visitor's owned rewards when authed.
import { NextResponse } from 'next/server'
import { listRewards, listMyRewards, getUserBySessionToken } from '../../../lib/db.mjs'

export async function GET(request) {
  const token = request.cookies.get('mn_session')?.value
  const user = token ? await getUserBySessionToken(token) : null
  const [rewards, myRewards] = await Promise.all([
    listRewards(),
    user ? listMyRewards(user.id) : Promise.resolve([]),
  ])
  return NextResponse.json({ rewards, myRewards, me: user ? { id: user.id, username: user.username } : null })
}