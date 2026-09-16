// GET /api/plans — public, paid subscription catalog (XP-pass anchors hidden).
import { NextResponse } from 'next/server'
import { listSubscriptionPlans } from '../../../lib/db.mjs'

export async function GET() {
  return NextResponse.json({ plans: await listSubscriptionPlans() })
}