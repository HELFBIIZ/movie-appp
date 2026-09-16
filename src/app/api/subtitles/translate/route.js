import { NextResponse } from 'next/server'
import { setTranslatedSubtitle, getAnySubtitle } from '@/lib/subtitle-store'
import { saveGenerated } from '@/lib/generated-store'
import { osSearch, osDownloadContent, osTranslateToMongolian } from '@/lib/opensubtitles'
import {
  translateLinesToMongolian,
  resolveSubtisSource,
  fetchRemoteSubtitle,
  parseCues,
  buildVtt,
} from '@/lib/translate'

async function resolveOpenSubtitlesSource({ tmdbId, title, year, type, season, episode }) {
  const apiKey = process.env.OPENSUBTITLES_API_KEY
  if (!apiKey || (!tmdbId && !title)) return null

  // Without OPENSUBTITLES_USERNAME/PASSWORD the download endpoint rejects us,
  // but we still try search first — if download fails we return null and the
  // caller falls through to Subt.is instead of crashing with HTTP 500.
  try {
    const native = await osSearch({ tmdbId, lang: 'mn', title, year, type, season, episode })
    if (native?.length) {
      const fileId = native[0].fileId
      if (fileId != null) {
        try {
          const content = await osDownloadContent(fileId)
          if (content) return { content, language: 'mn', sourceDetail: 'OpenSubtitles (native Mongolian)' }
        } catch {}
      }
    }
  } catch {}

  try {
    const english = await osSearch({ tmdbId, lang: 'en', title, year, type, season, episode })
    if (english?.length) {
      const fileId = english[0].fileId
      if (fileId != null) {
        try {
          const content = await osDownloadContent(fileId)
          if (content) return { content, language: 'en', sourceDetail: 'OpenSubtitles (English → Mongolian)' }
        } catch {}
      }
    }
  } catch {}

  return null
}

export async function POST(request) {
  const apiKey = process.env.TRANSLATEAPI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'TranslateAPI key not configured. Add TRANSLATEAPI_API_KEY to .env.local' },
      { status: 500 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    let content
    let sourceDetail = ''
    let nativeMongolian = false
    let osEnglish = false

    if (body.subFileUrl) {
      if (body.subFileUrl.startsWith('/api/subtitles/')) {
        const parts = body.subFileUrl.split('/').filter(Boolean)
        const rawId = parts[parts.length - 1]
        const stored = getAnySubtitle(rawId)
        if (!stored) throw new Error('Subtitle source not found')
        content = stored.content
      } else {
        content = await fetchRemoteSubtitle(body.subFileUrl)
      }
    } else if (body.title) {
      const osSource = await resolveOpenSubtitlesSource({
        tmdbId: body.tmdbId,
        title: body.title,
        year: body.year,
        type: body.type === 'episode' ? 'episode' : body.type,
        season: body.season,
        episode: body.episode,
      })
      if (osSource) {
        content = osSource.content
        sourceDetail = osSource.sourceDetail
        nativeMongolian = osSource.language === 'mn'
        osEnglish = osSource.language === 'en'
      } else {
        // Subt.is is flaky — a failure here means "no English source to
        // translate from", not a server bug. Return null so we can give the
        // user a clear answer instead of an internal error.
        try {
          content = await resolveSubtisSource({
            title: body.title,
            year: body.year,
            type: body.type,
            season: body.season,
            episode: body.episode,
          })
          sourceDetail = 'Subt.is'
        } catch {
          content = null
        }
      }
      if (!content) {
        return NextResponse.json(
          {
            error:
              'No subtitle source found for this title (no Mongolian or English track exists on our providers).',
          },
          { status: 404 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Provide subFileUrl or title to translate' },
        { status: 400 }
      )
    }

    const cues = parseCues(content)
    if (!cues.length) {
      return NextResponse.json({ error: 'No subtitle cues found in file' }, { status: 400 })
    }

    let vtt
    let translatedUnique = 0
    let googleTranslated = 0
    let totalUnique = 0
    let quotaHit = false

    if (nativeMongolian) {
      vtt = buildVtt(cues)
    } else if (osEnglish) {
      try {
        const ai = await osTranslateToMongolian(content)
        vtt = buildVtt(parseCues(ai.content))
        sourceDetail = `${sourceDetail} (${ai.api})`
      } catch {
        const lines = cues.map((c) => c.text)
        const result = await translateLinesToMongolian(apiKey, lines)
        translatedUnique = result.translatedUnique
        googleTranslated = result.googleTranslated
        totalUnique = result.totalUnique
        quotaHit = result.quotaHit

        cues.forEach((cue, i) => {
          cue.text = result.translated[i]
        })

        vtt = buildVtt(cues)
        sourceDetail = `${sourceDetail} (translated)`

        const translatedTotal = translatedUnique + googleTranslated
        if (quotaHit && translatedTotal === 0) {
          return NextResponse.json(
            {
              error:
                'Translation service unavailable right now — try again in a few minutes.',
            },
            { status: 429 }
          )
        }
      }
    } else {
      const lines = cues.map((c) => c.text)
      const result = await translateLinesToMongolian(apiKey, lines)
      translatedUnique = result.translatedUnique
      googleTranslated = result.googleTranslated
      totalUnique = result.totalUnique
      quotaHit = result.quotaHit

      cues.forEach((cue, i) => {
        cue.text = result.translated[i]
      })

      vtt = buildVtt(cues)

      const translatedTotal = translatedUnique + googleTranslated
      if (quotaHit && translatedTotal === 0) {
        return NextResponse.json(
          {
            error:
              'Translation service unavailable right now — try again in a few minutes.',
          },
          { status: 429 }
        )
      }
    }

    const id = crypto.randomUUID()
    setTranslatedSubtitle(id, vtt)

    const isTV = body.type === 'episode' || body.type === 'tv' || body.type === 'series'
    const durableSlug = body.slug
      ? isTV && body.season && body.episode
        ? `${body.slug}-S${String(body.season).padStart(2, '0')}E${String(body.episode).padStart(2, '0')}`
        : body.slug
      : null

    const meta = {
      partial: nativeMongolian ? false : quotaHit && translatedUnique + googleTranslated < totalUnique,
      translatedLineRatio: nativeMongolian
        ? 1
        : totalUnique
          ? (translatedUnique + googleTranslated) / totalUnique
          : 1,
      sourceDetail,
      cueCount: cues.length,
    }
    if (durableSlug) saveGenerated(durableSlug, vtt, meta)

    return NextResponse.json({
      translatedUrl: durableSlug
        ? `/api/subtitles/mongolian/${encodeURIComponent(durableSlug)}`
        : `/api/subtitles/translated/${id}`,
      cueCount: cues.length,
      characterCount: vtt.length,
      sourceDetail,
      partial: meta.partial,
      translatedLineRatio: meta.translatedLineRatio,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}