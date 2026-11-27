import { NextResponse } from 'next/server';
import { requireUser } from '@/db/index.mjs';

const names = [
  'OPENSUBTITLES_API_KEY',
  'OPENSUBTITLES_API_BASE',
  'OPENSUBTITLES_USERNAME',
  'OPENSUBTITLES_PASSWORD',
  'TRANSLATEAPI_API_KEY',
];

export async function GET(request) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.roleCode))
    return NextResponse.json({ error: { code: 'ADMIN_REQUIRED' } }, { status: 403 });
  const info = Object.fromEntries(names.map((n) => [n, Boolean(process.env[n]?.trim())]));
  return NextResponse.json(info, { headers: { 'Cache-Control': 'private, no-store' } });
}
