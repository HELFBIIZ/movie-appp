import { NextResponse } from 'next/server';
import { getTranslatedSubtitle } from '@/lib/subtitle-store';
import { translatedContent } from '@/db/translation-jobs.mjs';
import { getDb } from '@/db/index.mjs';

export async function GET(request, { params }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return new NextResponse('Not found', { status: 404 });
  const entry = getTranslatedSubtitle(id);
  const content = entry?.content ?? (await translatedContent(await getDb(), id));
  if (!content) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
