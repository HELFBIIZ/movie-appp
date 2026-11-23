import { NextResponse } from 'next/server';
import { requireUser, rateLimit } from '@/db/index.mjs';
import { pollSubtitleTranslation } from '@/lib/subtitle-translation.mjs';

export async function GET(request, { params }) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (rateLimit(`translation-poll:${user.id}`, { max: 25, windowMs: 60_000 }).limited)
    return NextResponse.json({ error: 'Түр хүлээгээд дахин шалгаарай.' }, { status: 429 });
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const result = await pollSubtitleTranslation(user, id);
    return result
      ? NextResponse.json(result, {
          status: result.status === 'pending' ? 202 : result.error ? 409 : 200,
          headers: { 'Cache-Control': 'no-store' },
        })
      : NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch {
    return NextResponse.json(
      { error: 'Орчуулгын явцыг шалгаж чадсангүй. Дахин шалгаарай.' },
      { status: 503 },
    );
  }
}
