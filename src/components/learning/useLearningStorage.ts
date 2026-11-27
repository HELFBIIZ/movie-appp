'use client';
import { useLearningAccount } from './LearningAccount';
import type { Progress } from '@/lib/learning/types';

export function useLearningStorage() {
  const account = useLearningAccount();
  return {
    progress: account.loaded && account.writable ? account.snapshot.progress : null,
    storageError: account.error,
    update: (change: (current: Progress) => Progress) =>
      account.update((snapshot) => ({ ...snapshot, progress: change(snapshot.progress) })),
  };
}
