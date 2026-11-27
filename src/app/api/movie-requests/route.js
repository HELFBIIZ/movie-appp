// /api/movie-requests — signed-in users ask for a movie/series or an update.
// GET  → the caller's own requests (newest first)
// POST → validated request + fan-out to admins. Approval never grants playback.
import { NextResponse } from 'next/server';
import {
  requireUser,
  rateLimit,
  createMovieRequest,
  listMovieRequests,
  listAdminUserIds,
  createNotification,
} from '../../../db/index.mjs';
import {
  parseJsonBody,
  reqStr,
  optStr,
  intBetween,
  oneOf,
  all,
  badInput,
} from '../../../lib/validate';

export async function GET(request) {
  const token = request.cookies.get('mn_session')?.value;
  const { user, error } = await requireUser(token);
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });
  const requests = await listMovieRequests({ userId: user.id, limit: 50 });
  return NextResponse.json({ ok: true, requests });
}

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value;
  const { user, error } = await requireUser(token);
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });

  const limited = rateLimit(`movie-request:${user.id}`, { max: 4, windowMs: 60 * 60 * 1000 });
  if (limited.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', retryAfterSeconds: limited.retryAfterSeconds } },
      { status: 429 },
    );
  }

  const body = await parseJsonBody(request);
  const title = reqStr(body?.title?.trim?.(), { min: 2, max: 160 });
  const type = oneOf(body?.type ?? 'movie', ['movie', 'series']);
  const note = optStr(body?.note?.trim?.(), { max: 1000 });
  const link = optStr(body?.link?.trim?.(), { max: 500 });
  const year =
    body?.year === undefined || body?.year === null || body?.year === ''
      ? { ok: true, value: null }
      : intBetween(body.year, { min: 1900, max: 2100 });
  const check = all(title, type, note, link, year);
  if (check.error) return badInput('Invalid movie request', check.error.field);

  if (link.value && !/^https:\/\/[^\s]+\.[^\s]+$/i.test(link.value)) {
    return badInput('Link must be an https URL', 'link');
  }

  const created = await createMovieRequest({
    userId: user.id,
    title: title.value,
    year: year.value,
    type: type.value,
    link: link.value,
    note: note.value,
  });

  try {
    const admins = await listAdminUserIds();
    await Promise.all(
      admins.map((id) =>
        createNotification({
          userId: id,
          type: 'movie_request',
          title: 'Шинэ киноны хүсэлт',
          body: `${user.username || user.email}: ${title.value}`,
          link: '/admin/movie-requests',
        }),
      ),
    );
  } catch {}

  return NextResponse.json({ ok: true, request: created }, { status: 201 });
}
