import { z } from 'zod';

const providerSchema = z.object({
  responseStatus: z.coerce.number(),
  quotaFinished: z.boolean().optional(),
  responseData: z.object({ translatedText: z.string().max(4000) }).optional(),
});
export async function translateWord(
  word: string,
  request: typeof fetch = fetch,
): Promise<string | null> {
  if (!/^[a-z]+(?:['-][a-z]+)*(?: [a-z]+(?:['-][a-z]+)*){0,5}$/.test(word) || word.length > 80)
    return null;
  return requestMongolian(word, 300, request);
}
// Anonymous GET only: no billing key, contribution, import or paid fallback.
export async function requestMongolian(
  text: string,
  maximum: number,
  request: typeof fetch = fetch,
): Promise<string | null> {
  if (!text.trim() || new TextEncoder().encode(text).length > 500) return null;
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', 'en|mn');
  const response = await request(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const parsed = providerSchema.safeParse(await response.json());
  if (!parsed.success || parsed.data.responseStatus !== 200 || parsed.data.quotaFinished)
    return null;
  const value = parsed.data.responseData?.translatedText
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_match, code: string) => {
      const point = Number(code);
      return point >= 32 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
    })
    .replace(
      /&(?:quot|apos|amp);/g,
      (entity) => ({ '&quot;': '"', '&apos;': "'", '&amp;': '&' })[entity] ?? '',
    )
    .trim();
  if (
    !value ||
    value.length > maximum ||
    !/[А-Яа-яӨөҮүЁё]/.test(value) ||
    /[\u0000-\u001f]/.test(value)
  )
    return null;
  return value;
}
