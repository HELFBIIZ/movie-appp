import { NextResponse } from 'next/server';
import { runVipMaintenance } from '../../../../lib/vip-maintenance.mjs';

const SECRET = process.env.CRON_SECRET?.trim();

export async function GET(request) {
  const provided = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!SECRET || !provided || provided !== SECRET) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }
  return NextResponse.json(await runVipMaintenance({ force: true }));
}
