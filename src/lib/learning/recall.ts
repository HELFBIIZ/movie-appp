import type { LearningItem } from './types.ts';

export function normalizeRecall(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[’‘]/g, "'")
    .replace(/[‐‑–—]/g, '-')
    .replace(/\s+/g, ' ');
}
export function recallCorrect(item: Pick<LearningItem, 'word'>, value: string) {
  return !!value.trim() && normalizeRecall(item.word) === normalizeRecall(value);
}
export function recallQueue(items: LearningItem[], now: number, limit = 5) {
  return items
    .filter((item) => item.kind === 'word' && item.meaning.trim())
    .sort(
      (a, b) =>
        Number(a.dueAt > now) - Number(b.dueAt > now) || a.dueAt - b.dueAt || a.savedAt - b.savedAt,
    )
    .slice(0, limit);
}
// Hide every occurrence, including contractions. Escape subtitle text before making a regexp.
export function recallContext(item: Pick<LearningItem, 'word' | 'example'>) {
  const word = normalizeRecall(item.word)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/'/g, "['’‘]")
    .replace(/-/g, '[-‐‑–—]');
  return item.example.replace(
    new RegExp(`(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`, 'giu'),
    '_____',
  );
}
