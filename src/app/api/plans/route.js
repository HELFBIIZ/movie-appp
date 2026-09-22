// GET /api/plans — public, paid subscription catalog (XP-pass anchors hidden).
import { NextResponse } from 'next/server'
import { listSubscriptionPlans } from '../../../lib/db.mjs'

export async function GET() {
  try {
    return NextResponse.json({ plans: await listSubscriptionPlans() })
  } catch (err) {
    console.error('[GET /api/plans]', err?.message || err)
    return NextResponse.json({ error: { code: 'PLANS_FAILED', message: String(err?.message || err).slice(0, 300) } }, { status: 500 })
  }
}