// /api/admin/movie-requests — ADMIN/SUPER_ADMIN review queue.
//   GET   ?status=PENDING|APPROVED|REJECTED|ADDED
//   PATCH { id, status, adminNote? } → decision + notification to requester
import { NextResponse } from 'next/server';
import {
  requireRole,
  listMovieRequests,
  reviewMovieRequest,
  createNotification,
  notifyAllUsers,
} from '../../../../db/index.mjs';
import { parseJsonBody, reqStr, optStr, oneOf, all, badInput } from '../../../../lib/validate';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'ADDED'];

export async function GET(request) {
  const token = request.cookies.get('mn_session')?.value;
  const { error } = await requireRole(token, 'ADMIN', 'SUPER_ADMIN');
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });
  const status = request.nextUrl.searchParams.get('status') || 'PENDING';
  if (!STATUSES.includes(status)) return badInput('Invalid status', 'status');
  return NextResponse.json({
    ok: true,
    status,
    requests: await listMovieRequests({ status, limit: 200 }),
  });
}

export async function PATCH(request) {
  const token = request.cookies.get('mn_session')?.value;
  const { user, error } = await requireRole(token, 'ADMIN', 'SUPER_ADMIN');
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });

  const body = await parseJsonBody(request);
  const id = reqStr(body?.id, { min: 8, max: 64, pattern: /^[a-zA-Z0-9-]+$/ });
  const status = oneOf(body?.status, ['APPROVED', 'REJECTED', 'ADDED']);
  const adminNote = optStr(body?.adminNote?.trim?.(), { max: 500 });
  const check = all(id, status, adminNote);
  if (check.error) return badInput('id + status required', check.error.field);

  const updated = await reviewMovieRequest({
    id: id.value,
    status: status.value,
    adminNote: adminNote.value,
    reviewedBy: user.id,
  });
  if (!updated) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });

  const messages = {
    APPROVED: 'Таны киноны хүсэлтийг хүлээн авлаа. Нэмэх ажиллагаа үргэлжилж байна.',
    ADDED: `«${updated.title}» кино санд нэмэгдлээ. Шинэ кинонуудаас хайж үзээрэй.`,
    REJECTED: `«${updated.title}» хүсэлтийг хүлээж аваагүй. ${adminNote.value || 'Дахин оролдоно уу.'}`,
  };
  try {
    if (status.value === 'ADDED') {
      await notifyAllUsers({
        type: 'new_movie',
        title: '🎬 Шинэ кино нэмэгдлээ',
        body: messages.ADDED,
        link: '/movies',
      });
    } else {
      await createNotification({
        userId: updated.user_id,
        type: 'movie_request_reviewed',
        title: 'Киноны хүсэлтийн хариу',
        body: messages[status.value],
        link: '/movies',
      });
    }
  } catch {}

  return NextResponse.json({ ok: true, request: updated });
}
