import { NextResponse } from 'next/server'
import { resolveStreamCandidates } from '@/lib/streams'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('tmdbId')
  const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie'
  const mediaType = searchParams.get('mediaType') || type
  const season = searchParams.get('season') ? Number(searchParams.get('season')) : undefined
  const episode = searchParams.get('episode') ? Number(searchParams.get('episode')) : undefined
  const variant = Number(searchParams.get('variant') || 0)
  const forceRefresh = searchParams.get('refresh') === '1'

  if (!tmdbId) {
    return NextResponse.json({ error: 'Missing tmdbId' }, { status: 400 })
  }

  try {
    const candidates = await resolveStreamCandidates(tmdbId, { type, season, episode, forceRefresh, mediaType })
    if (!candidates.length) {
      return NextResponse.json({ error: 'No playable stream found. Try again in a moment.' }, { status: 404 })
    }
    const index = Math.min(Math.max(variant, 0), candidates.length - 1)
    const stream = candidates[index]
    return NextResponse.json({
      provider: stream.provider,
      label: stream.label,
      quality: stream.quality,
      url: stream.url,
      type: stream.type || 'hls',
      candidates,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Stream resolution failed' }, { status: 500 })
  }
}