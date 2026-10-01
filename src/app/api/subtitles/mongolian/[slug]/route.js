import { NextResponse } from 'next/server'
import { getGenerated } from '@/lib/generated-store'

export async function GET(request, { params }) {
  const { slug } = await params
  const entry = getGenerated(slug)
  if (!entry) {
    return new NextResponse('Not found', { status: 404 })
  }

  const wantsMeta = new URL(request.url).searchParams.get('meta') === '1'
  if (wantsMeta) {
    return NextResponse.json(entry.meta)
  }

  return new NextResponse(entry.content, {
    headers: {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
}