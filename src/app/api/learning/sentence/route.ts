import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, rateLimit } from '@/db/index.mjs';
import { readCaptionCache, writeCaptionCache } from '@/db/learning';
import { createSentenceLookup, translateSentence } from '@/lib/learning/sentence-meaning';
import { normalizeSentence, readSentenceBody } from '@/lib/learning/sentence-text';
import { sentenceGuide } from '@/lib/learning/sentence-guide';

const lookup = createSentenceLookup({
  read: readCaptionCache,
  write: (key, value) => writeCaptionCache(key, value, 30 * 86_400_000),
  translate: translateSentence,
});
export async function POST(request: NextRequest) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  const headers = { 'Cache-Control': 'private, no-store' };
  if (error)
    return NextResponse.json({ error: { code: 'SIGN_IN_REQUIRED' } }, { status: 401, headers });
  if (rateLimit(`learning-sentence:${user.id}`, { max: 120, windowMs: 300_000 }).limited)
    return NextResponse.json({ error: { code: 'TRY_LATER' } }, { status: 429, headers });
  try {
    const data = await readSentenceBody(request);
    const text = normalizeSentence(
      data && typeof data === 'object' && 'text' in data ? data.text : null,
    );
    if (!text)
      return NextResponse.json({ error: { code: 'INVALID_SENTENCE' } }, { status: 400, headers });
    const authored = sentenceGuide(text);
    if (authored)
      return NextResponse.json({ translation: authored, source: 'curated' }, { headers });
    const key = `learning-sentence:v1:${createHash('sha256').update(text).digest('hex')}`;
    const result = await lookup(key, text);
    return 'translation' in result
      ? NextResponse.json({ ...result, source: 'mymemory' }, { headers })
      : NextResponse.json({ error: { code: result.error } }, { status: 503, headers });
  } catch {
    return NextResponse.json({ error: { code: 'MEANING_UNAVAILABLE' } }, { status: 503, headers });
  }
}
