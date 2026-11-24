import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, requireUser, rateLimit } from '@/db/index.mjs';
import { readCaptionCache, writeCaptionCache } from '@/db/learning';
import { reserveWordLookup } from '@/db/word-budget.mjs';
import { normalizeWord, teachingLesson } from '@/lib/learning/teaching';
import { translateWord } from '@/lib/learning/word-provider';

const cachedSchema = z.object({
  word: z.string(),
  meaning: z.string().min(1).max(300),
  source: z.literal('mymemory'),
});
const pending = new Map<string, Promise<z.infer<typeof cachedSchema> | null>>();
async function lookup(word: string) {
  const key = `learning-word:v1:${word}`;
  const cached = cachedSchema.safeParse(await readCaptionCache(key));
  if (cached.success && cached.data.word === word) return cached.data;
  if (!(await reserveWordLookup(await getDb(), word.length))) return null;
  const meaning = await translateWord(word);
  if (!meaning) return null;
  const result = { word, meaning, source: 'mymemory' as const };
  await writeCaptionCache(key, result, 30 * 86_400_000);
  return result;
}
export async function GET(request: NextRequest) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error: { code: 'SIGN_IN_REQUIRED' } }, { status: 401 });
  if (rateLimit(`learning-word:${user.id}`, { max: 40, windowMs: 300_000 }).limited)
    return NextResponse.json({ error: { code: 'TRY_LATER' } }, { status: 429 });
  const word = normalizeWord(request.nextUrl.searchParams.get('word') ?? '');
  if (!/^[a-z]+(?:['-][a-z]+)*(?: [a-z]+(?:['-][a-z]+)*){0,5}$/.test(word) || word.length > 80)
    return NextResponse.json({ error: { code: 'INVALID_WORD' } }, { status: 400 });
  const local = teachingLesson(word, word);
  if (local) return NextResponse.json(local, { headers: { 'Cache-Control': 'private, no-store' } });
  try {
    let job = pending.get(word);
    if (!job) {
      job = lookup(word).finally(() => pending.delete(word));
      pending.set(word, job);
    }
    const result = await job;
    return result
      ? NextResponse.json(
          { ...result, tip: '', example: '', translation: '', contextual: false },
          { headers: { 'Cache-Control': 'private, no-store' } },
        )
      : NextResponse.json({ error: { code: 'MEANING_UNAVAILABLE' } }, { status: 503 });
  } catch {
    return NextResponse.json({ error: { code: 'MEANING_UNAVAILABLE' } }, { status: 503 });
  }
}
