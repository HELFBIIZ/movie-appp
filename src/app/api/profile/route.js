import { NextResponse } from 'next/server'
import { getUserBySessionToken, getProfile, updateProfile } from '../../../lib/db.mjs'

const COOKIE_NAME = 'mn_session'

async function getUser(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return getUserBySessionToken(token)
}

export async function GET(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
  const profile = await getProfile(user.id)
  return NextResponse.json({
    me: {
      id: user.id, email: user.email, username: user.username, roleCode: user.roleCode,
      profile: profile || { avatarUrl: null, displayName: user.username, bio: null },
    },
  })
}

export async function PATCH(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 40) || null : undefined
  const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 280) || null : undefined
  const avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim().slice(0, 500) || null : undefined
  const result = await updateProfile(user.id, { displayName, bio, avatarUrl })
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
  const profile = await getProfile(user.id)
  return NextResponse.json({ ok: true, profile })
}
