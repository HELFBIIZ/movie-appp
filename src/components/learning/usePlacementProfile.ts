'use client';
import { assessPlacement, type PlacementAnswers } from '@/lib/learning/placement';
import { addAssessment } from '@/lib/learning/snapshot';
import { useLearningAccount } from './LearningAccount';

export function usePlacementProfile() {
  const account = useLearningAccount();
  const history = account.snapshot.assessments;
  const last = history.at(-1);
  return {
    loaded: account.loaded,
    profile: last ? assessPlacement(last.answers, last.completedAt) : null,
    error: account.error,
    history,
    save: (answers: PlacementAnswers) => {
      const completedAt = Date.now();
      const profile = assessPlacement(answers, completedAt);
      const saved = account.update((snapshot) => addAssessment(snapshot, answers, completedAt));
      return { profile, saved };
    },
  };
}
