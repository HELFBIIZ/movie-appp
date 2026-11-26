import { requestMongolian } from './word-provider.ts';
import { normalizeSentence, hasMongolianMeaning } from './sentence-text.ts';
export async function translateSentence(text: string, request: typeof fetch = fetch) {
  const normalized = normalizeSentence(text);
  return normalized ? requestMongolian(normalized, 1000, request) : null;
}

type Dependencies = {
  read: (key: string) => Promise<unknown>;
  write: (key: string, value: string) => Promise<void>;
  reserve: (bytes: number) => Promise<boolean>;
  translate: (text: string) => Promise<string | null>;
};
export function createSentenceLookup(dependencies: Dependencies) {
  const pending = new Map<
    string,
    Promise<{ translation: string } | { error: 'FREE_LIMIT_REACHED' | 'MEANING_UNAVAILABLE' }>
  >();
  return async (key: string, text: string) => {
    let job = pending.get(key);
    if (!job) {
      job = (async () => {
        const cached = await dependencies.read(key);
        if (typeof cached === 'string' && cached.length <= 1000 && hasMongolianMeaning(cached))
          return { translation: cached };
        if (!(await dependencies.reserve(new TextEncoder().encode(text).length)))
          return { error: 'FREE_LIMIT_REACHED' as const };
        const translation = await dependencies.translate(text);
        if (!translation || translation.length > 1000 || !hasMongolianMeaning(translation))
          return { error: 'MEANING_UNAVAILABLE' as const };
        await dependencies.write(key, translation);
        return { translation };
      })().finally(() => pending.delete(key));
      pending.set(key, job);
    }
    return job;
  };
}
