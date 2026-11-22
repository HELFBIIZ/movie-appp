import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, rateLimit } from '@/db/index.mjs';
import { readLearningState, writeLearningState } from '@/db/learning';
import { snapshotSchema } from '@/lib/learning/snapshot';

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: 401 });
  const state = await readLearningState(user.id);
  return NextResponse.json(
    { ...state, snapshot: snapshotSchema.parse(state.snapshot) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
export async function PUT(request: NextRequest) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (rateLimit(`learning-state:${user.id}`, { max: 120 }).limited)
    return NextResponse.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 });
  const raw = await request.text();
  if (raw.length > 3_500_000)
    return NextResponse.json({ error: { code: 'TOO_LARGE' } }, { status: 413 });
  let parsed;
  try {
    parsed = z
      .object({ revision: z.number().int().nonnegative(), snapshot: snapshotSchema })
      .parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_STATE' } }, { status: 400 });
  }
  const saved = await writeLearningState(user.id, parsed.revision, parsed.snapshot);
  return saved
    ? NextResponse.json({ revision: parsed.revision + 1 })
    : NextResponse.json({ error: { code: 'REVISION_CONFLICT' } }, { status: 409 });
}
