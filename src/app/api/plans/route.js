// GET /api/plans — public, paid subscription catalog (XP-pass anchors hidden).
import { NextResponse } from 'next/server';
import { listSubscriptionPlans } from '../../../db/index.mjs';
import { runVipMaintenance } from '../../../lib/vip-maintenance.mjs';

export async function GET() {
  try {
    void runVipMaintenance().catch(() => {});
    return NextResponse.json({ plans: await listSubscriptionPlans() });
  } catch (err) {
    console.error('[GET /api/plans]', err?.message || err);
    return NextResponse.json(
      { error: { code: 'PLANS_FAILED', message: String(err?.message || err).slice(0, 300) } },
      { status: 500 },
    );
  }
}
