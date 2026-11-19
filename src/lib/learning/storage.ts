import { z } from 'zod';
import type { LearningItem, Progress } from './types.ts';

export const STORAGE_KEY = 'vxnta.scenechain.v1';
export const MAX_ITEMS = 500;
const boundedText = z.string().min(1).max(4000);
const itemSchema = z.object({
  id: boundedText,
  kind: z.enum(['word', 'sentence']),
  word: boundedText,
  meaning: z.string().max(4000),
  example: z.string().max(4000),
  movieId: boundedText,
  mediaId: boundedText,
  cueStart: z.number().finite().nonnegative(),
  cueEnd: z.number().finite().nonnegative(),
  stage: z.number().int().min(0).max(4),
  correct: z.number().int().nonnegative(),
  incorrect: z.number().int().nonnegative(),
  dueAt: z.number().finite().nonnegative(),
  savedAt: z.number().finite().nonnegative(),
});
const progressSchema = z.object({
  items: z.array(itemSchema).max(MAX_ITEMS),
  contextCorrect: z.number().int().nonnegative(),
  contextIncorrect: z.number().int().nonnegative(),
});
export const emptyProgress = (): Progress => ({
  items: [],
  contextCorrect: 0,
  contextIncorrect: 0,
});

export function decodeProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  if (raw.length > 3_000_000) throw new Error('Хадгалсан өгөгдлийн хэмжээ хэтэрсэн.');
  const result = progressSchema.safeParse(JSON.parse(raw));
  if (!result.success) throw new Error('Хадгалсан өгөгдлийн бүтэц буруу байна.');
  if (new Set(result.data.items.map((item) => item.id)).size !== result.data.items.length) {
    throw new Error('Давхардсан өгөгдөл олдлоо.');
  }
  return result.data;
}

export function itemId(
  item: Pick<LearningItem, 'movieId' | 'mediaId' | 'kind' | 'word' | 'cueStart'>,
): string {
  return JSON.stringify([
    item.movieId,
    item.mediaId,
    item.kind,
    item.word.toLocaleLowerCase('en').trim(),
    item.kind === 'sentence' ? item.cueStart : null,
  ]);
}

export function addItem(progress: Progress, item: LearningItem): Progress {
  if (progress.items.some((saved) => saved.id === item.id)) return progress;
  if (progress.items.length >= MAX_ITEMS)
    throw new Error('500 картын хязгаарт хүрсэн. Эхлээд карт устгана уу.');
  return { ...progress, items: [...progress.items, item] };
}

export function persistProgress(storage: Pick<Storage, 'setItem'>, progress: Progress): void {
  // Validate writes too; failed writes must never be shown as saved.
  const validated = progressSchema.parse(progress);
  storage.setItem(STORAGE_KEY, JSON.stringify(validated));
}
