import { NextResponse } from 'next/server';
import { getMovieBySlug } from '../../../lib/movies';
import { awardXp } from '../../../lib/xp.mjs';
import {
  requireUser,
  rateLimit,
  hasVerifiedWatch,
  createMovieComment,
  listMovieComments,
} from '../../../db/index.mjs';

function cleanBody(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

export async function GET(request) {
  const slug = request.nextUrl.searchParams.get('slug') || '';
  if (!getMovieBySlug(slug)) {
    return NextResponse.json({ error: { code: 'MOVIE_NOT_FOUND' } }, { status: 404 });
  }
  const session = await requireUser(request.cookies.get('mn_session')?.value);
  const verified = session.user ? await hasVerifiedWatch(session.user.id, slug) : false;
  return NextResponse.json({
    comments: await listMovieComments(slug, 50),
    verified,
    canComment: Boolean(session.user),
  });
}

export async function POST(request) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_BODY' } }, { status: 400 });
  }
  const slug = String(payload.slug || '').trim();
  const body = cleanBody(payload.body);
  if (!getMovieBySlug(slug) || body.length < 2) {
    return NextResponse.json({ error: { code: 'INVALID_COMMENT' } }, { status: 400 });
  }

  const rl = rateLimit(`comment:${user.id}:${slug}`, { max: 20 });
  if (rl.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', retryAfterSeconds: rl.retryAfterSeconds } },
      { status: 429 },
    );
  }

  if (!(await hasVerifiedWatch(user.id, slug))) {
    return NextResponse.json(
      { error: { code: 'WATCH_REQUIRED', message: 'Энэ киногоо үзсэний дараа коммент бичнэ үү.' } },
      { status: 403 },
    );
  }

  const comment = await createMovieComment({ userId: user.id, slug, body });
  const xp = await awardXp({
    userId: user.id,
    activity: 'COMMENT',
    eventKey: `comment:${user.id}:${comment.id}`,
  });
  return NextResponse.json({ comment, xp: { gained: xp.gained ?? 0 } });
}
