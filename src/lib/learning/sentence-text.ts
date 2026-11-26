export function normalizeSentence(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    value.length > 1000 ||
    /\n\s*\n|\r\s*\r|[\u0000-\u0008\u000b\u000c\u000e-\u001f]|https?:\/\/|www\./i.test(value)
  )
    return null;
  const text = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  return /[a-z]{2}/i.test(text) && new TextEncoder().encode(text).length <= 400 ? text : null;
}
export function hasMongolianMeaning(value: string): boolean {
  return (value.match(/[А-Яа-яӨөҮүЁё]/g)?.length ?? 0) >= 2;
}
export async function readSentenceBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  let bytes = 0,
    body = '';
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 4096) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(body + decoder.decode()) as unknown;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
