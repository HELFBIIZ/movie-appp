// GET /api/admin/overview — admin dashboard rollups (users, money, receipts,
// XP, reviews) + recent rows. ADMIN/SUPER_ADMIN only.
//   200 { ok, stats, recent, catalog } · 401/403 UNAUTHENTICATED/FORBIDDEN
import { NextResponse } from 'next/server'
import { requireRole, adminOverview } from '../../../../lib/db.mjs'
import { movies, kdramaMovies, westernMovies } from '../../../../lib/movies'

export async function GET(request) {
  const token = request.cookies.get('mn_session')?.value
  const { user, error } = await requireRole(token, 'ADMIN', 'SUPER_ADMIN')
  if (error) return NextResponse.json({ error }, { status: error.status || 401 })

  const { stats, recent } = await adminOverview()
  return NextResponse.json({
    ok: true,
    stats,
    recent,
    catalog: { movies: movies.length, kdramas: kdramaMovies.length, western: westernMovies.length },
  })
}