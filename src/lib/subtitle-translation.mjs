import crypto from 'node:crypto';
import { getDb } from '@/db/index.mjs';
import {
  findTranslation,
  reserveTranslation,
  getTranslation,
  saveTranslation,
} from '@/db/translation-jobs.mjs';
import { writeCaptionCache } from '@/db/learning';
import { osAiSession } from '@/lib/opensubtitles';
import { createSubtitleTranslationClient } from '@/lib/opensubtitles-ai.mjs';
import { parseCues, buildVtt, buildSrt } from '@/lib/subtitles-format';
import { usableMongolian } from '@/lib/learning/captions';

const provider = createSubtitleTranslationClient(osAiSession);
function response(job) {
  if (job.status === 'completed')
    return {
      status: 'completed',
      translatedUrl: `/api/subtitles/translated/${job.id}`,
      cueCount: job.cueCount,
      partial: job.partial,
      sourceDetail: 'OpenSubtitles · Автомат орчуулга',
    };
  if (['failed', 'unconfirmed'].includes(job.status))
    return {
      status: job.status,
      error:
        job.status === 'failed'
          ? 'Орчуулга амжилтгүй боллоо. Өөр Монгол хадмал сонгоорой.'
          : 'Өмнөх орчуулгын хүсэлт баталгаажаагүй байна. Давхар орчуулга эхлүүлээгүй. Дэмжлэгт хандана уу.',
    };
  return { status: 'pending', jobUrl: `/api/subtitles/jobs/${job.id}` };
}
export async function startSubtitleTranslation(user, mediaKey, content) {
  const srt = buildSrt(parseCues(content));
  const client = await getDb();
  const inputHash = crypto.createHash('sha256').update(`${mediaKey}\n${content}`).digest('hex');
  const existing = await findTranslation(client, user.id, inputHash);
  if (existing) return response(existing);
  const { engine } = await provider.prepare(srt);
  const { created, job } = await reserveTranslation(client, user.id, inputHash, {
    status: 'starting',
    engine,
    mediaKey,
    english: content,
    startedAt: Date.now(),
  });
  if (!created) return response(job);
  try {
    job.correlationId = await provider.start(srt, engine);
    job.status = 'pending';
  } catch {
    job.status = 'unconfirmed';
  }
  await saveTranslation(client, user.id, job);
  return response(job);
}
export async function pollSubtitleTranslation(user, id) {
  const client = await getDb();
  const job = await getTranslation(client, id, user.id);
  if (!job) return null;
  if (job.status === 'starting' && Date.now() - job.startedAt > 45_000) job.status = 'unconfirmed';
  if (job.status !== 'pending') return response(job);
  const result = await provider.poll(job.correlationId);
  if (result.status === 'pending') return response(job);
  if (result.status === 'completed') {
    const cues = parseCues(result.content);
    const vtt = buildVtt(cues);
    if (usableMongolian(vtt)) {
      job.status = 'completed';
      job.vtt = vtt;
      job.cueCount = cues.length;
      job.partial =
        cues.filter((cue) => /[\u0400-\u04ff]/.test(cue.text)).length / cues.length < 0.98;
      if (['ADMIN', 'SUPER_ADMIN'].includes(user.roleCode))
        await writeCaptionCache(
          job.mediaKey,
          {
            english: job.english,
            mongolian: vtt,
            partial: job.partial,
            notice: `Автомат орчуулга${job.partial ? ' · Зарим мөр орчуулагдаагүй.' : ''}`,
          },
          2_592_000_000,
        );
    } else job.status = 'failed';
  } else job.status = 'failed';
  await saveTranslation(client, user.id, job);
  return response(job);
}
