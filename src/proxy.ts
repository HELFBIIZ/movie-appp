import { clerkMiddleware } from '@clerk/nextjs/server'

// Clerk is only needed where we read the signed-in Clerk identity: the one
// route that bridges it onto our own `mn_session` cookie. Every other route
// (players, subtitles, Wire webhook, admin) keeps running on our existing
// session, so it stays out of the matcher and untouched by this middleware.
export default clerkMiddleware()

export const config = {
  matcher: ['/login', '/api/auth/clerk'],
}
