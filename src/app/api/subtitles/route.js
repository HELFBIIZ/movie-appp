import { NextResponse } from 'next/server'
import {
  subtisSearchTitles,
  subtisListSubtitles,
  subtisDownloadUrl,
  guessLanguage,
  pickTitleMatch,
} from '@/lib/subtis'
import { normalizeToVtt } from '@/lib/subtitles-format'
import { setSourceSubtitle } from '@/lib/subtitle-store'
import { osSearch, osDownloadContent } from '@/lib/opensubtitles'

const PANEL_TO_OS = {
  mon: 'mn',
  eng: 'en',
  kor: 'ko',
  jpn: 'ja',
  zho: 'zh',
  rus: 'ru',
  spa: 'es',
  fre: 'fr',
  ger: 'de',
  ara: 'ar',
  hin: 'hi',
  tur: 'tr',
  ita: 'it',
  por: 'pt',
  vie: 'vi',
  tha: 'th',
  ind: 'id',
}

const PANEL_TO_SUBTIS = {
  mon: 'mon',
  eng: 'eng',
  kor: 'kor',
  jpn: 'jpn',
  zho: 'zho',
  rus: 'rus',
  spa: 'spa',
  fre: 'fre',
  ger: 'ger',
  ara: 'ara',
  hin: 'hin',
  tur: 'tur',
  ita: 'ita',
  por: 'por',
  vie: 'vie',
  tha: 'tha',
  ind: 'ind',
}

async function searchOpenSubtitles({ tmdbId, lang, query, type }) {
  const apiKey = process.env.OPENSUBTITLES_API_KEY
  if (!apiKey) {
    return { error: 'OpenSubtitles API key not configured', used: 'subt' }
  }

  const results = await osSearch({ tmdbId, lang, title: query, type })

  return { results: results || [], provider: 'opensubtitles', used: 'subt' }
}

async function searchSubtIs({ title, year, type, season, episode, lang }) {
  if (!title) {
    return { error: 'Title required to search keyless subtitles', used: 'subt' }
  }

  const candidates = await subtisSearchTitles(title)
  const match = pickTitleMatch(candidates, { title, year, type })
  if (!match) {
    return { results: [], provider: 'subtis', used: 'subt' }
  }

  const data = await subtisListSubtitles(match.slug)
  let subs = (data.results || []).map((entry) => {
    const sub = entry.subtitle || {}
    const guess = guessLanguage(sub.subtitle_file_name, sub.preview)
    const seasonNum = sub.current_season
    const episodeNum = sub.current_episode
    return {
      id: sub.id,
      provider: 'subtis',
      subId: sub.id,
      fileName: sub.subtitle_file_name || sub.title_file_name || match.slug,
      language: guess.code,
      languageLabel: guess.label,
      rating: sub.is_valid ? 4 : null,
      downloadCount: sub.queried_times ?? 0,
      format: 'srt',
      season: seasonNum ?? null,
      episode: episodeNum ?? null,
    }
  })

  const isTV = type === 'episode' || type === 'tv' || type === 'series'
  if (isTV && season && episode) {
    subs = subs.filter(
      (s) => s.season === Number(season) && s.episode === Number(episode)
    )
  }

  if (lang) {
    const matching = subs.filter((s) => s.language === lang)
    if (matching.length) subs = matching
  }

  return { results: subs.slice(0, 10), provider: 'subtis', used: 'subt' }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('tmdb_id')
  const lang = searchParams.get('lang') || 'mon'
  const query = searchParams.get('query')
  const type = searchParams.get('type') || 'episode'
  const title = searchParams.get('title')
  const year = searchParams.get('year')

  try {
    if (process.env.OPENSUBTITLES_API_KEY) {
      const osLang = PANEL_TO_OS[lang] || lang
      const osResult = await searchOpenSubtitles({ tmdbId, lang: osLang, query, type })
      if (!osResult.error && osResult.results?.length) return NextResponse.json(osResult)

      if (osLang === 'mn') {
        const enFallback = await searchOpenSubtitles({ tmdbId, lang: 'en', query, type })
        if (!enFallback.error && enFallback.results?.length) {
          return NextResponse.json({
            ...enFallback,
            fallbackFrom: 'mn',
            message: 'No native Mongolian subtitles exist for this title — showing English subs to translate.',
          })
        }
      }
    }

    const result = await searchSubtIs({
      title,
      year: year ? Number(year) : null,
      type,
      season: searchParams.get('season'),
      episode: searchParams.get('episode'),
      lang: lang === 'mon' ? 'mon' : PANEL_TO_SUBTIS[lang] || null,
    })
    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          hint: 'Add OPENSUBTITLES_API_KEY to .env.local for full-language subtitle search.',
          results: [],
        },
        { status: 200 }
      )
    }
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message, results: [] }, { status: 200 })
  }
}

export async function POST(request) {
  const body = await request.json()

  try {
    if (body.subId) {
      const finalUrl = await subtisDownloadUrl(body.subId)
      const res = await fetch(finalUrl, {
        headers: { 'User-Agent': 'VXNTA v1.0' },
      })
      if (!res.ok) throw new Error(`Download failed (${res.status})`)

      const raw = await res.text()
      const vtt = normalizeToVtt(raw)
      const id = crypto.randomUUID()
      setSourceSubtitle(id, vtt)

      return NextResponse.json({
        link: `/api/subtitles/source/${id}`,
        format: 'vtt',
        provider: 'subtis',
      })
    }

    if (!body.fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 })
    }

    const raw = await osDownloadContent(body.fileId)
    const vtt = normalizeToVtt(raw)
    const id = crypto.randomUUID()
    setSourceSubtitle(id, vtt)

    return NextResponse.json({
      link: `/api/subtitles/source/${id}`,
      format: 'vtt',
      provider: 'opensubtitles',
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}