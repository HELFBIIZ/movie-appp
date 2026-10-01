// src/app/me/actions.mjs — server actions for the profile page.
// Delegates every award to the single shared XP ledger (../lib/xp.mjs) so the
// same rules + daily caps apply everywhere. XP is NEVER accepted from the
// client: a client can only ASK; this server grants per activity rule or refuses.
import { awardXp as grantAwardXp } from '../lib/xp.mjs'

const ACTIVITY_ALIAS = Object.freeze({
  WATCH: 'VIDEO_VIEW',
  LOGIN: 'DAILY_LOGIN',
  RATE: 'RATING',
})

export async function awardXp(activity, userId) {
  const realActivity = ACTIVITY_ALIAS[activity]
  if (!realActivity) return { error: { code: 'UNKNOWN_ACTIVITY' } }
  return grantAwardXp({ userId, activity: realActivity })
}