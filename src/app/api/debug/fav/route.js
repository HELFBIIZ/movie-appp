import { NextResponse } from 'next/server'
import { getDb } from '../../../lib/db.mjs'
import { getUserBySessionToken } from '../../../lib/db.mjs'

export async function GET(request) {
  const trace = []
  try {
    const token = request.cookies.get('mn_session')?.value
    const user = await getUserBySessionToken(token)
    if (!user || user.roleCode !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'ADMIN_ONLY' }, { status: 403 })
    }
    trace.push('auth ok')
    const slug = new URL(request.url).searchParams.get('slug') || 'dune-part-two'
    const client = await getDb()
    trace.push('client ok')
    const ex = await client.execute({ sql: `SELECT id FROM favorites WHERE user_id = ? AND movie_id = ?`, args: [user.id, slug] })
    trace.push(`select ok rows=${ex.rows.length}`)
    await client.execute({ sql: `INSERT OR IGNORE INTO movies (id, slug, title) VALUES (?, ?, ?)`, args: [slug, slug, slug] })
    trace.push('mirror ok')
    return NextResponse.json({ ok: true, trace })
  } catch (err) {
    return NextResponse.json({ ok: false, trace, error: String(err?.message || err).slice(0, 300) }, { status: 500 })
  }
}
