import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Clerk is only needed where we read the signed-in Clerk identity: the one
// route that bridges it onto our own `mn_session` cookie. Every other route
// (players, subtitles, Wire webhook, admin) keeps running on our existing
// session, so it stays out of the matcher and untouched by this middleware.
const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

export default clerkEnabled ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: ['/login', '/api/auth/clerk'],
};
