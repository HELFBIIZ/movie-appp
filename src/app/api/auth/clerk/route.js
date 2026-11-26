// POST /api/auth/clerk
// Bridges a verified Clerk identity (Google/Apple OAuth) onto our own session.
//
// Clerk proves *who* the visitor is; our DB still owns *what they are allowed
// to do*. Everything downstream - VIP subscription, admin role, XP, favorites,
// profile, watchlist - keeps reading the same `mn_session` cookie the password
// flow issues, so no other route has to know Clerk exists.
import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  resolveExternalUser,
  createSession,
  buildSessionCookie,
  rateLimit,
  logSecurity,
} from '../../../../db/index.mjs';
import { flipLoginStreak, awardXp } from '../../../../lib/xp.mjs';

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const rl = rateLimit(`clerk:${ip}`, { max: 8 });
  if (rl.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', retryAfterSeconds: rl.retryAfterSeconds } },
      { status: 429 },
    );
  }

  let authState;
  try {
    authState = await auth();
  } catch {
    return NextResponse.json({ error: { code: 'CLERK_UNAVAILABLE' } }, { status: 503 });
  }
  if (!authState?.userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 });
  }

  // A session token is not an email: read the verified address off the Clerk
  // profile so we never trust anything the client could have tampered with.
  let clerkUser = null;
  try {
    clerkUser = await currentUser();
  } catch {
    clerkUser = null;
  }
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    clerkUser?.emailAddresses?.[0]?.emailAddress ||
    null;
  const displayName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ').trim() ||
    clerkUser?.username ||
    (email ? email.split('@')[0] : null);

  const resolved = await resolveExternalUser({
    provider: 'clerk',
    externalId: authState.userId,
    email,
    displayName,
  });
  if (resolved.error) {
    return NextResponse.json({ error: { code: resolved.error } }, { status: 400 });
  }

  const session = await createSession(resolved.userId);
  if (session.error) {
    return NextResponse.json({ error: { code: session.error.code } }, { status: 500 });
  }

  // Same daily grant the password login gives, so neither sign-in path is
  // advantaged over the other. Internally idempotent per calendar day.
  const [streak, daily] = await Promise.all([
    flipLoginStreak({ userId: resolved.userId }),
    awardXp({
      userId: resolved.userId,
      activity: 'DAILY_LOGIN',
      eventKey: `login:${resolved.userId}:${new Date().toISOString().slice(0, 10)}`,
    }),
  ]);
  await logSecurity({
    userId: resolved.userId,
    type: 'login-success',
    detail: `session issued from oauth (clerk) ${ip}${resolved.created ? ' [new user]' : ''}`,
    ip,
  });

  const response = NextResponse.json({
    ok: true,
    created: resolved.created,
    user: { id: resolved.userId, email, username: null },
    xp: { gained: daily.gained ?? 0, status: daily.error?.code ?? 'ok' },
    streak,
  });
  response.headers.set('Set-Cookie', buildSessionCookie(session.token, session.expiresAt));
  return response;
}
