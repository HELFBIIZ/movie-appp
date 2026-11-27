import { NextResponse } from 'next/server';
import { resolveStreamCandidates } from '@/lib/streams';
import { movies } from '@/lib/movies';
import { requireUser, rateLimit, getActiveSubscription, canWatch } from '@/db/index.mjs';
import { z } from 'zod';

export async function GET(request) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (rateLimit(`stream:${user.id}`, { max: 30 }).limited)
    return NextResponse.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 });
  const { searchParams } = new URL(request.url);
  const parsed = z
    .object({
      tmdbId: z.coerce.number().int().positive(),
      type: z.enum(['movie', 'tv']),
      season: z.coerce.number().int().min(1).max(100),
      episode: z.coerce.number().int().min(1).max(1000),
      variant: z.coerce.number().int().min(0).max(100),
    })
    .safeParse({
      tmdbId: searchParams.get('tmdbId'),
      type: searchParams.get('type') || 'movie',
      season: searchParams.get('season') || 1,
      episode: searchParams.get('episode') || 1,
      variant: searchParams.get('variant') || 0,
    });
  if (!parsed.success)
    return NextResponse.json({ error: { code: 'INVALID_STREAM_REQUEST' } }, { status: 400 });
  const { tmdbId, type, season, episode, variant } = parsed.data;
  const movie = movies.find(
    (item) =>
      Number(item.tmdbId) === tmdbId &&
      (['kdrama', 'western', 'tv', 'series'].includes(item.category) && item.episodes > 1
        ? 'tv'
        : 'movie') === type,
  );
  if (!movie) return NextResponse.json({ error: { code: 'MOVIE_NOT_FOUND' } }, { status: 404 });
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.roleCode)) {
    const verdict = await canWatch(user.id, movie, await getActiveSubscription(user.id));
    if (!verdict.allowed)
      return NextResponse.json({ error: { code: 'SUBSCRIPTION_REQUIRED' } }, { status: 402 });
  }
  const forceRefresh = searchParams.get('refresh') === '1';

  try {
    const candidates = await resolveStreamCandidates(tmdbId, {
      type,
      season,
      episode,
      forceRefresh,
    });
    if (!candidates.length) {
      return NextResponse.json(
        { error: 'No playable stream found. Try again in a moment.' },
        { status: 404 },
      );
    }
    const index = Math.min(Math.max(variant, 0), candidates.length - 1);
    const stream = candidates[index];
    return NextResponse.json({
      provider: stream.provider,
      label: stream.label,
      quality: stream.quality,
      url: stream.url,
      candidates,
    });
  } catch {
    return NextResponse.json({ error: 'Тоглуулах эх сурвалжийг нээж чадсангүй.' }, { status: 503 });
  }
}
