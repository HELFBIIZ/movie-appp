import { NextResponse } from 'next/server';
import { getGenerated } from '@/lib/generated-store';
import { readCaptionCache } from '@/db/learning';
import { mongolianTrack } from '@/lib/learning/captions';

export async function GET(request, { params }) {
  const { slug } = await params;
  let entry = getGenerated(slug);
  try {
    const uploaded = await readCaptionCache(`uploaded:${slug}`);
    const cached = uploaded?.mongolian ? uploaded : await readCaptionCache(slug);
    if (cached?.mongolian)
      entry = {
        content: cached.mongolian,
        meta: { language: 'mn', partial: cached.partial !== false, sourceDetail: cached.notice },
      };
  } catch {
    /* Existing file subtitles remain available during database outages. */
  }
  if (!entry) {
    return new NextResponse('Not found', { status: 404 });
  }

  const track = mongolianTrack(entry.content);
  if (!track) return new NextResponse('Mongolian subtitles unavailable', { status: 404 });
  const meta = {
    ...entry.meta,
    cueCount: track.cueCount,
    partial: Boolean(entry.meta.partial || track.partial),
  };

  const wantsMeta = new URL(request.url).searchParams.get('meta') === '1';
  if (wantsMeta) {
    return NextResponse.json(meta);
  }

  return new NextResponse(track.content, {
    headers: {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
      'X-Subtitle-Partial': meta.partial ? 'true' : 'false',
    },
  });
}
