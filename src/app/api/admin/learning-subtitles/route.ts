import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, rateLimit } from '@/db/index.mjs';
import { readCaptionCache, writeCaptionCache } from '@/db/learning';
import { getMovieBySlug } from '@/lib/movies';
import { parseExistingVtt } from '@/lib/learning/movie';
import { usableMongolian } from '@/lib/learning/captions';

export async function POST(request: NextRequest) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.roleCode))
    return NextResponse.json({ error: { code: 'ADMIN_REQUIRED' } }, { status: 403 });
  if (rateLimit(`admin-captions:${user.id}`, { max: 20 }).limited)
    return NextResponse.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 });
  const raw = await request.text();
  if (raw.length > 1_200_000)
    return NextResponse.json({ error: { code: 'TOO_LARGE' } }, { status: 413 });
  try {
    const input = z
      .object({
        slug: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(200),
        language: z.enum(['en', 'mn']),
        season: z.number().int().min(1).max(100),
        episode: z.number().int().min(1).max(1000),
        content: z.string().max(1_000_000),
      })
      .parse(JSON.parse(raw));
    const movie = getMovieBySlug(input.slug);
    if (!movie) return NextResponse.json({ error: { code: 'MOVIE_NOT_FOUND' } }, { status: 404 });
    const cues = parseExistingVtt(input.content);
    if (!cues.length || (input.language === 'mn' && !usableMongolian(input.content)))
      return NextResponse.json({ error: { code: 'INVALID_CAPTIONS' } }, { status: 400 });
    const isTV =
      ['kdrama', 'western', 'tv', 'series'].includes(movie.category) && (movie.episodes ?? 0) > 1;
    const key = isTV
      ? `${movie.slug}-S${String(input.season).padStart(2, '0')}E${String(input.episode).padStart(2, '0')}`
      : movie.slug;
    const cached = z
      .object({
        english: z.string(),
        mongolian: z.string(),
        notice: z.string(),
        partial: z.boolean().default(true),
      })
      .safeParse(await readCaptionCache(`uploaded:${key}`));
    const value = cached.success ? cached.data : { english: '', mongolian: '', notice: '' };
    await writeCaptionCache(
      `uploaded:${key}`,
      {
        ...value,
        [input.language === 'en' ? 'english' : 'mongolian']: input.content,
        partial: input.language === 'mn' ? false : cached.success ? cached.data.partial : true,
        notice: 'Админы нэмсэн хадмал. Киноны хувилбар, цагийг тулгаж шалгаарай.',
      },
      315_360_000_000,
    );
    return NextResponse.json({ ok: true, key, cues: cues.length });
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_CAPTIONS' } }, { status: 400 });
  }
}
