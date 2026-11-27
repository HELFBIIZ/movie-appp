import { NextResponse } from 'next/server';
import { getMovieBySlug } from '../../../../../lib/movies';
import {
  requireUser,
  rateLimit,
  upsertWatchRecord,
  getActiveSubscription,
  canWatch,
} from '../../../../../db/index.mjs';

function runtimeSeconds(value) {
  const text = String(value || '');
  const hours = Number(/(\d+)\s*h/i.exec(text)?.[1] ?? 0);
  const minutes = Number(/(\d+)\s*m/i.exec(text)?.[1] ?? 0);
  return Math.max(60, (hours * 60 + minutes) * 60);
}

export async function POST(request, { params }) {
  const { slug } = await params;
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });

  const movie = getMovieBySlug(slug);
  if (!movie) return NextResponse.json({ error: { code: 'MOVIE_NOT_FOUND' } }, { status: 404 });
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.roleCode)) {
    const verdict = await canWatch(user.id, movie, await getActiveSubscription(user.id));
    if (!verdict.allowed)
      return NextResponse.json({ error: { code: 'SUBSCRIPTION_REQUIRED' } }, { status: 402 });
  }

  const rl = rateLimit(`watch-progress:${user.id}:${slug}`, { max: 240 });
  if (rl.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', retryAfterSeconds: rl.retryAfterSeconds } },
      { status: 429 },
    );
  }

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_BODY' } }, { status: 400 });
  }
  const watched = Number(payload.watchedSeconds);
  if (!Number.isFinite(watched) || watched <= 0 || watched > 86400) {
    return NextResponse.json({ error: { code: 'INVALID_PROGRESS' } }, { status: 400 });
  }

  const progress = Math.min(1, watched / runtimeSeconds(movie.runtime));
  const completed = progress >= 0.9;
  await upsertWatchRecord({ userId: user.id, slug, progress, completed });
  return NextResponse.json({ ok: true, progress, completed, verified: progress >= 0.3 });
}
