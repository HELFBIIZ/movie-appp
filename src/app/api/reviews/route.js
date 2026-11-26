import { NextResponse } from 'next/server';
import { requireUser, upsertReview, getReviewsBySlug } from '../../../db/index.mjs';
import { getMovieBySlug } from '../../../lib/movies';
import { awardXp } from '../../../lib/xp.mjs';
import { parseJsonBody, reqStr, optStr, intBetween, all, badInput } from '../../../lib/validate';

export async function GET(request) {
  const slug = request.nextUrl.searchParams.get('slug') || '';
  if (!getMovieBySlug(slug)) return badInput('Unknown movie', 'slug');
  return NextResponse.json({ ok: true, reviews: await getReviewsBySlug(slug) });
}

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value;
  const { user, error } = await requireUser(token);
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });

  const body = await parseJsonBody(request);
  const slug = reqStr(body?.slug, { min: 1, max: 200 });
  const rating = intBetween(body?.rating, { min: 1, max: 10 });
  const text = optStr(body?.text?.trim?.(), { max: 1000 });
  const check = all(slug, rating, text);
  if (check.error) return badInput('Invalid review', check.error.field);
  if (!getMovieBySlug(slug.value)) return badInput('Unknown movie', 'slug');

  const review = await upsertReview({
    userId: user.id,
    slug: slug.value,
    rating: rating.value,
    text: text.value,
  });
  const day = new Date().toISOString().slice(0, 10);
  const rated = await awardXp({
    userId: user.id,
    activity: 'RATING',
    eventKey: `rating:${user.id}:${slug.value}:${day}`,
  });
  const reviewed = text.value
    ? await awardXp({
        userId: user.id,
        activity: 'REVIEW',
        eventKey: `review:${user.id}:${slug.value}:${day}`,
      })
    : { gained: 0 };
  return NextResponse.json({
    ok: true,
    review,
    xp: { gained: (rated.gained || 0) + (reviewed.gained || 0) },
  });
}
