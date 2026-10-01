import { NextResponse } from 'next/server'
import { getUserBySessionToken, listFavorites, toggleFavorite } from '../../../lib/db.mjs'

const COOKIE_NAME = 'mn_session'

async function getUser(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return getUserBySessionToken(token)
}

export async function GET(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ favorites: [] })
    return NextResponse.json({ favorites: await listFavorites(user.id) })
  } catch (err) {
    console.error('[GET /api/favorites]', err?.message || err)
    return NextResponse.json({ error: { code: 'FAVORITES_FAILED', message: String(err?.message || err).slice(0, 200) } }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const movieSlug = body?.slug
    if (!movieSlug) return NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
    const result = await toggleFavorite(user.id, movieSlug)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.error.status ?? 400 })
    return NextResponse.json({ ok: true, favorited: result.favorited })
  } catch (err) {
    console.error('[POST /api/favorites]', err?.message || err)
    return NextResponse.json({ error: { code: 'FAVORITES_FAILED', message: String(err?.message || err).slice(0, 200) } }, { status: 500 })
  }
}
