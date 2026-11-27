import type { LearningItem } from './types.ts';

export const REVIEW_DAYS = [1, 3, 7, 14] as const;
export const DAY_MS = 86_400_000;

export function reviewItem(
  item: LearningItem,
  remembered: boolean,
  now = Date.now(),
): LearningItem {
  const stage = remembered ? Math.min(item.stage + 1, REVIEW_DAYS.length) : 0;
  return {
    ...item,
    stage,
    correct: item.correct + (remembered ? 1 : 0),
    incorrect: item.incorrect + (remembered ? 0 : 1),
    dueAt: now + (remembered ? REVIEW_DAYS[stage - 1] * DAY_MS : 10 * 60_000),
  };
}

export function isDue(item: LearningItem, now = Date.now()): boolean {
  return item.dueAt <= now;
}
