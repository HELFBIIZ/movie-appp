// POST /api/watch/[slug] — SERVER-side watch gate.
//
// The chip's doctrine: the DECISION is made in THIS route, every request,
// never trusted from any client flag. The watch page asks "may I watch slug X
// with my session?" and only a YES here (after requireUser + rate-limit +
// canWatch against OUR db) returns an embed. A client can re-draw its own
// player ANY way it likes — it cannot conjure a player for a title it was
// not granted, because the grant itself is conditioned server-side on the
// SAME active subscription row canWatch consults for the page's own gate.
//
// Returns (exact, typed — same chip family as auth errors):
//  200 { allowed:true, player:{ embedUrl, altUrl, label } }
//  401 { error:{ code:'UNAUTHENTICATED' } }
//  402 { error:{ code:'SUBSCRIPTION_REQUIRED' } }       (no active sub)
//  403 { error:{ code:'EXPIRED_SUBSCRIPTION' } }        (sub present, lapsed)
//  404 { error:{ code:'MOVIE_NOT_FOUND' } }
//  429 { error:{ code:'RATE_LIMITED', retryAfterSeconds: n } }
import { NextResponse } from 'next/server'
import { getMovieBySlug } from '@/lib/movies'
import {
  requireUser, rateLimit, getActiveSubscription, canWatch, upsertWatchRecord,
} from '../../../../lib/db.mjs'
import { awardXp } from '../../../../lib/xp.mjs'

const VIDSRC_BASE = 'https://vidsrc.buzz'
const VIDCORE_BASE = 'https://vidcore.org'

function buildEmbedUrl(tmdbId, mediaType, season = null, episode = null) {
  if (!tmdbId) return null
  if (mediaType === 'tv') {
    return `${VIDSRC_BASE}/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`
  }
  return `${VIDSRC_BASE}/embed/movie/${tmdbId}`
}

function buildVidCoreUrl(tmdbId, mediaType, season = null, episode = null) {
  if (!tmdbId) return null
  if (mediaType === 'tv') {
    return `${VIDCORE_BASE}/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`
  }
  return `${VIDCORE_BASE}/embed/movie/${tmdbId}`
}

export async function POST(request, { params }) {
  const { slug } = await params
  const token = request.cookies.get('mn_session')?.value
  const { user, error } = await requireUser(token)
  if (error) {
    return NextResponse.json({ error }, { status: error.status || 401 })
  }

  const rl = rateLimit(`watch:${user.id}:${slug}`, { max: 8 })
  if (rl.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', retryAfterSeconds: rl.retryAfterSeconds } },
      { status: 429 }
    )
  }

  const movie = getMovieBySlug(slug)
  if (!movie) {
    return NextResponse.json({ error: { code: 'MOVIE_NOT_FOUND' } }, { status: 404 })
  }

  // Admin bypass: ADMIN/SUPER_ADMIN watch anything without a subscription.
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.roleCode)
  if (!isAdmin) {
    const [sub] = await Promise.all([getActiveSubscription(user.id)])
    const verdict = await canWatch(user.id, movie, sub)
    if (!verdict.allowed) {
      const status = verdict.code === 'NO_ACTIVE_SUBSCRIPTION' ? 402 : 403
      return NextResponse.json({ error: verdict }, { status })
    }
  }

  const embedUrl = buildEmbedUrl(movie.tmdbId, movie.mediaType, movie.season, movie.episode)
  const altUrl = buildVidCoreUrl(movie.tmdbId, movie.mediaType, movie.season, movie.episode)

  // Watch history + VIDEO_VIEW XP (capped 6×/day inside awardXp). Never fail
  // the watch for a ledger hiccup — these are best-effort side effects.
  try {
    await upsertWatchRecord({ userId: user.id, slug })
    const xp = await awardXp({ userId: user.id, activity: 'VIDEO_VIEW' })
    return NextResponse.json({
      allowed: true,
      movie: { slug, tmdbId: movie.tmdbId, mediaType: movie.mediaType },
      player: { embedUrl, altUrl },
      xp: { gained: xp.gained ?? 0, status: xp.error?.code ?? 'ok' },
    })
  } catch {
    return NextResponse.json({
      allowed: true,
      movie: { slug, tmdbId: movie.tmdbId, mediaType: movie.mediaType },
      player: { embedUrl, altUrl },
    })
  }
}
