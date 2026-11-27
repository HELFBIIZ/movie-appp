import { NextResponse } from 'next/server';
import { setTranslatedSubtitle, getAnySubtitle } from '@/lib/subtitle-store';
import { saveGenerated } from '@/lib/generated-store';
import { osSearch, osDownloadContent } from '@/lib/opensubtitles';
import { usableMongolian, captionMatches } from '@/lib/learning/captions';
import { hasMongolianMeaning } from '@/lib/learning/sentence-text';
import { startSubtitleTranslation } from '@/lib/subtitle-translation.mjs';
import { getMovieBySlug } from '@/lib/movies';
import { requireUser, rateLimit, getActiveSubscription, canWatch } from '@/db/index.mjs';
import { readCaptionCache, writeCaptionCache } from '@/db/learning';
import {
  translateLinesToMongolian,
  resolveSubtisSource,
  parseCues,
  buildVtt,
} from '@/lib/translate';

async function resolveOpenSubtitlesSource({ tmdbId, title, year, type, season, episode }) {
  const apiKey = process.env.OPENSUBTITLES_API_KEY;
  if (!apiKey || (!tmdbId && !title)) return null;

  const native = await osSearch({ tmdbId, lang: 'mn', title, year, type, season, episode });
  const identity = {
    tmdbId: Number(tmdbId),
    mediaType: type === 'episode' ? 'tv' : 'movie',
    season,
    episode,
  };
  const nativeMatch = native?.find((candidate) => captionMatches(candidate, identity, 'mn'));
  if (nativeMatch) {
    const fileId = nativeMatch.fileId;
    if (fileId !== null && fileId !== undefined) {
      const content = await osDownloadContent(fileId);
      if (content)
        return { content, language: 'mn', sourceDetail: 'OpenSubtitles (native Mongolian)' };
    }
  }

  const english = await osSearch({ tmdbId, lang: 'en', title, year, type, season, episode });
  const englishMatch = english?.find((candidate) => captionMatches(candidate, identity, 'en'));
  if (englishMatch) {
    const fileId = englishMatch.fileId;
    if (fileId !== null && fileId !== undefined) {
      const content = await osDownloadContent(fileId);
      if (content)
        return { content, language: 'en', sourceDetail: 'OpenSubtitles (English → Mongolian)' };
    }
  }

  return null;
}

export async function POST(request) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (rateLimit(`translate:${user.id}`, { max: 3, windowMs: 600_000 }).limited)
    return NextResponse.json(
      { error: 'Орчуулгын хүсэлтийн лимит хүрлээ. Дараа дахин оролдоно уу.' },
      { status: 429 },
    );
  const apiKey = process.env.TRANSLATEAPI_API_KEY;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const movie = getMovieBySlug(body?.slug);
  if (!movie) return NextResponse.json({ error: 'Кино олдсонгүй.' }, { status: 404 });
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.roleCode)) {
    const verdict = await canWatch(user.id, movie, await getActiveSubscription(user.id));
    if (!verdict.allowed) return NextResponse.json({ error: verdict }, { status: 402 });
  }
  body.tmdbId = movie.tmdbId;
  body.title = movie.title;
  body.year = movie.year;
  body.type =
    ['kdrama', 'western', 'tv', 'series'].includes(movie.category) && movie.episodes > 1
      ? 'episode'
      : 'movie';
  if (
    body.type === 'episode' &&
    ![body.season, body.episode].every(
      (value) => Number.isSafeInteger(value) && value > 0 && value <= 1000,
    )
  )
    return NextResponse.json({ error: 'Улирал, ангийн дугаар буруу байна.' }, { status: 400 });

  try {
    let content;
    let sourceDetail = '';
    let nativeMongolian = false;
    let osEnglish = false;

    if (body.subFileUrl) {
      const url = new URL(body.subFileUrl, request.url);
      if (
        url.origin === new URL(request.url).origin &&
        /^\/api\/subtitles\/(?:source|translated)\/[a-f0-9-]{36}$/i.test(url.pathname) &&
        !url.search &&
        !url.hash
      ) {
        const rawId = url.pathname.split('/').at(-1);
        const stored = getAnySubtitle(rawId);
        if (!stored) throw new Error('Subtitle source not found');
        content = stored.content;
      } else {
        return NextResponse.json(
          { error: 'Энэ сайтын хадмалын хэсгээс эх хадмалаа сонгоно уу.' },
          { status: 400 },
        );
      }
    } else if (body.title) {
      const osSource = await resolveOpenSubtitlesSource({
        tmdbId: body.tmdbId,
        title: body.title,
        year: body.year,
        type: body.type === 'episode' ? 'episode' : body.type,
        season: body.season,
        episode: body.episode,
      });
      if (osSource) {
        content = osSource.content;
        sourceDetail = osSource.sourceDetail;
        nativeMongolian = osSource.language === 'mn';
        osEnglish = osSource.language === 'en';
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
          });
          sourceDetail = 'Subt.is';
        } catch {
          content = null;
        }
      }
      if (!content) {
        return NextResponse.json(
          {
            error:
              'No subtitle source found for this title (no Mongolian or English track exists on our providers).',
          },
          { status: 404 },
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Provide subFileUrl or title to translate' },
        { status: 400 },
      );
    }

    const cues = parseCues(content);
    if (!cues.length) {
      return NextResponse.json({ error: 'No subtitle cues found in file' }, { status: 400 });
    }
    if (!nativeMongolian && process.env.OPENSUBTITLES_API_KEY) {
      const mediaKey =
        body.type === 'episode'
          ? `${body.slug}-S${String(body.season).padStart(2, '0')}E${String(body.episode).padStart(2, '0')}`
          : body.slug;
      const result = await startSubtitleTranslation(user, mediaKey, content);
      return NextResponse.json(result, {
        status: result.status === 'pending' ? 202 : result.error ? 409 : 200,
      });
    }

    let vtt;
    let translatedUnique = 0;
    let googleTranslated = 0;
    let totalUnique = 0;
    let quotaHit = false;

    if (nativeMongolian) {
      vtt = buildVtt(cues);
    } else {
      const lines = cues.map((c) => c.text);
      if (!apiKey) throw new Error('Орчуулгын үйлчилгээ одоогоор боломжгүй байна.');
      const result = await translateLinesToMongolian(apiKey, lines);
      translatedUnique = result.translatedUnique;
      googleTranslated = result.googleTranslated;
      totalUnique = result.totalUnique;
      quotaHit = result.quotaHit;

      const translatedCues = cues
        .map((cue, i) => ({ ...cue, text: result.translated[i] || '' }))
        .filter((cue) => hasMongolianMeaning(cue.text));

      if (translatedCues.length === 0)
        return NextResponse.json(
          { error: 'Монгол орчуулга үүссэнгүй. Англи эхийг Монгол хадмал гэж хадгалаагүй.' },
          { status: 502 },
        );

      vtt = buildVtt(translatedCues);

      const translatedTotal = translatedUnique + googleTranslated;
      if (quotaHit && translatedTotal === 0) {
        return NextResponse.json(
          {
            error: 'Translation service unavailable right now — try again in a few minutes.',
          },
          { status: 429 },
        );
      }
    }

    if (!usableMongolian(vtt))
      return NextResponse.json(
        { error: 'Монгол орчуулга үүссэнгүй. Англи эхийг Монгол хадмал гэж хадгалаагүй.' },
        { status: 502 },
      );
    const id = crypto.randomUUID();
    setTranslatedSubtitle(id, vtt);

    const isTV = body.type === 'episode' || body.type === 'tv' || body.type === 'series';
    const durableSlug =
      ['ADMIN', 'SUPER_ADMIN'].includes(user.roleCode) && body.slug
        ? isTV && body.season && body.episode
          ? `${body.slug}-S${String(body.season).padStart(2, '0')}E${String(body.episode).padStart(2, '0')}`
          : body.slug
        : null;

    const meta = {
      partial: nativeMongolian
        ? false
        : quotaHit && translatedUnique + googleTranslated < totalUnique,
      translatedLineRatio: nativeMongolian
        ? 1
        : totalUnique
          ? (translatedUnique + googleTranslated) / totalUnique
          : 1,
      sourceDetail,
      cueCount: cues.length,
    };
    let translatedUrl = `/api/subtitles/translated/${id}`;
    if (durableSlug) {
      try {
        const cached = await readCaptionCache(durableSlug);
        await writeCaptionCache(
          durableSlug,
          {
            english: osEnglish ? content : cached?.english || '',
            mongolian: vtt,
            partial: meta.partial,
            notice: `${sourceDetail}${meta.partial ? ' · Зарим мөр орчуулагдаагүй.' : ''}`,
          },
          2_592_000_000,
        );
        translatedUrl = `/api/subtitles/mongolian/${encodeURIComponent(durableSlug)}`;
      } catch {
        /* The existing filesystem/ephemeral fallback still serves this request. */
      }
      try {
        saveGenerated(durableSlug, vtt, meta);
        translatedUrl = `/api/subtitles/mongolian/${encodeURIComponent(durableSlug)}`;
      } catch (saveErr) {
        // Read-only serverless FS (Netlify/Vercel) — still serve via ephemeral id.
        console.error('[translate] saveGenerated failed, using ephemeral:', saveErr?.message);
      }
    }

    return NextResponse.json({
      translatedUrl,
      cueCount: cues.length,
      characterCount: vtt.length,
      sourceDetail,
      partial: meta.partial,
      translatedLineRatio: meta.translatedLineRatio,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
