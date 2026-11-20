import { getStreamingSources } from '@/lib/watchmode'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('tmdbId')

  if (!tmdbId) {
    return Response.json({ sources: [] }, { status: 400 })
  }

  const sources = await getStreamingSources(tmdbId)
  return Response.json({ tmdbId, sources })
}