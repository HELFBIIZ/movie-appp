import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMovieBySlug } from '@/lib/movies';
import { requireUser, rateLimit, getActiveSubscription, canWatch } from '@/db/index.mjs';
import { readCaptionCache, writeCaptionCache } from '@/db/learning';
import { getGenerated } from '@/lib/generated-store';
import { osSearch, osDownloadContent } from '@/lib/opensubtitles';
import { normalizeToVtt } from '@/lib/subtitles-format';
import { parseExistingVtt } from '@/lib/learning/movie';
import { captionMatches, usableMongolian, type CaptionCandidate } from '@/lib/learning/captions';

const resultSchema = z.object({
  english: z.string().max(1_000_000),
  mongolian: z.string().max(1_000_000),
  notice: z.string(),
  partial: z.boolean().default(true),
});
const ongoing = new Map<string, Promise<z.infer<typeof resultSchema>>>();

function usableEnglishCues(cues: { text: string }[]): boolean {
  if (!cues.length) return false;
  const english = cues.filter((cue) => (cue.text.match(/[A-Za-z]/g)?.length ?? 0) >= 2).length;
  return english / cues.length >= 0.6;
}
export async function GET(request: NextRequest) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: 401 });
  const query = request.nextUrl.searchParams;
  const movie = getMovieBySlug(query.get('slug') ?? '');
  if (!movie) return NextResponse.json({ error: { code: 'MOVIE_NOT_FOUND' } }, { status: 404 });
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.roleCode)) {
    const verdict = await canWatch(user.id, movie, await getActiveSubscription(user.id));
    if (!verdict.allowed) return NextResponse.json({ error: verdict }, { status: 402 });
  }
  if (rateLimit(`learning-captions:${user.id}`, { max: 30 }).limited)
    return NextResponse.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 });
  const mediaType =
    ['kdrama', 'western', 'tv', 'series'].includes(movie.category) && (movie.episodes ?? 0) > 1
      ? 'tv'
      : 'movie';
  const parsed = z
    .object({
      season: z.coerce.number().int().min(1).max(100),
      episode: z.coerce.number().int().min(1).max(1000),
    })
    .safeParse({ season: query.get('season') ?? 1, episode: query.get('episode') ?? 1 });
  if (!parsed.success)
    return NextResponse.json({ error: { code: 'INVALID_EPISODE' } }, { status: 400 });
  const { season, episode } = parsed.data;
  const key =
    mediaType === 'tv'
      ? `${movie.slug}-S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
      : movie.slug;
  const cached = resultSchema.safeParse(await readCaptionCache(key));
  const uploaded = resultSchema.safeParse(await readCaptionCache(`uploaded:${key}`));
  if (cached.success)
    return NextResponse.json(
      uploaded.success
        ? {
            ...cached.data,
            english: uploaded.data.english || cached.data.english,
            mongolian: uploaded.data.mongolian || cached.data.mongolian,
            partial: uploaded.data.mongolian ? uploaded.data.partial : cached.data.partial,
            notice: `${uploaded.data.notice} ${cached.data.notice}`,
          }
        : cached.data,
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  if (!ongoing.has(key))
    ongoing.set(
      key,
      (async () => {
        // A missing MN track expires quickly; reuse EN instead of spending another download.
        const englishKey = `english-source:v1:${mediaType}:${movie.tmdbId}:${key}`;
        const savedEnglish = z
          .string()
          .max(1_000_000)
          .safeParse(await readCaptionCache(englishKey));
        let english = uploaded.success ? uploaded.data.english : '',
          mongolian = uploaded.success ? uploaded.data.mongolian : '';
        if (!english && savedEnglish.success && parseExistingVtt(savedEnglish.data).length)
          english = savedEnglish.data;
        let partial = uploaded.success ? uploaded.data.partial : false;
        const notices: string[] = [];
        const local = getGenerated(key);
        if (!mongolian && local && usableMongolian(local.content)) {
          mongolian = local.content;
          partial = Boolean(
            local.meta.partial ||
            (typeof local.meta.translatedLineRatio === 'number' &&
              local.meta.translatedLineRatio < 0.98),
          );
          notices.push(
            partial
              ? 'Монгол хадмалын зарим мөр орчуулагдаагүй байна.'
              : 'Сайтад байгаа Монгол хадмалыг нээлээ.',
          );
        }
        const tmdbId = Number(movie.tmdbId);
        if (Number.isSafeInteger(tmdbId) && tmdbId > 0 && process.env.OPENSUBTITLES_API_KEY) {
          const identity = { tmdbId, mediaType, season, episode } as const;
          for (const language of ['en', 'mn']) {
            if (language === 'en' && english) continue;
            if (language === 'mn' && mongolian && !partial) continue;
            try {
              const candidates = await osSearch({
                tmdbId,
                lang: language,
                type: mediaType === 'tv' ? 'episode' : 'movie',
                season,
                episode,
                title: undefined,
                year: undefined,
                limit: 10,
              });
              const candidate = candidates?.find((item: CaptionCandidate) =>
                captionMatches(item, identity, language),
              );
              if (!candidate?.fileId) continue;
              const text = normalizeToVtt(await osDownloadContent(candidate.fileId));
              if (text.length > 1_000_000) continue;
              const parsed = parseExistingVtt(text);
              if (!parsed.length) continue;
              if (language === 'en') {
                if (!usableEnglishCues(parsed)) continue;
                english = text;
                await writeCaptionCache(englishKey, english, 7 * 86_400_000);
              } else if (usableMongolian(text)) {
                mongolian = text;
                partial = false;
              }
              notices.push(
                `OpenSubtitles ${language.toUpperCase()} · ${candidate.fileName ?? 'хадмал'}${candidate.machineTranslated ? ' · машин орчуулга' : ''}`,
              );
            } catch {
              notices.push('Хадмал нийлүүлэгчийн холболт эсвэл таталтын лимит хүрсэн байж болно.');
            }
          }
        }
        if (!english) notices.push('EN хадмалын хэсгээс хайх эсвэл өөрийн .vtt нэмнэ үү.');
        if (!mongolian) notices.push('Монгол хадмал олдсонгүй. Өөрийн MN .vtt нэмэх боломжтой.');
        notices.push('Киноны хувилбар, хадмалын цагийг тулгаж шалгаарай.');
        const value = { english, mongolian, notice: notices.join(' '), partial };
        await writeCaptionCache(
          key,
          value,
          english && mongolian && !partial ? 86_400_000 : 3_600_000,
        );
        return value;
      })().finally(() => ongoing.delete(key)),
    );
  return NextResponse.json(await ongoing.get(key), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
