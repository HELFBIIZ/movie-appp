import { NextResponse } from 'next/server'
import { deleteSession } from '../../../../lib/db.mjs'

const COOKIE_NAME = 'mn_session'

export async function POST(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (token) {
    await deleteSession(token).catch(() => {})
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return res
}

export async function GET(request) {
  return POST(request)
}
