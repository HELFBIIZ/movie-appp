import { NextResponse } from 'next/server'
import { getSourceSubtitle } from '@/lib/subtitle-store'

export async function GET(request, { params }) {
  const { id } = await params
  const entry = getSourceSubtitle(id)
  if (!entry) {
    return new NextResponse('Not found', { status: 404 })
  }

  return new NextResponse(entry.content, {
    headers: {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}