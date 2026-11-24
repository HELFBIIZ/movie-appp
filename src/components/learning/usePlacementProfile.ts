'use client';
import {
  assessPlacement,
  nextPlacementForm,
  type PlacementAnswers,
  type PlacementForm,
} from '@/lib/learning/placement';
import { addAssessment } from '@/lib/learning/snapshot';
import { useLearningAccount } from './LearningAccount';

export function usePlacementProfile() {
  const account = useLearningAccount();
  const history = [
    ...account.snapshot.assessments.map((entry) => ({ ...entry, form: 'a' as const })),
    ...(account.snapshot.retests ?? []),
  ]
    .sort((a, b) => a.completedAt - b.completedAt)
    .slice(-30);
  const last = history.at(-1);
  return {
    loaded: account.loaded,
    profile: last ? assessPlacement(last.answers, last.completedAt, last.form) : null,
    nextForm: nextPlacementForm(last?.form),
    error: account.error,
    history,
    save: (answers: PlacementAnswers, form: PlacementForm = 'a') => {
      const completedAt = Date.now();
      const profile = assessPlacement(answers, completedAt, form);
      const saved = account.update((snapshot) =>
        addAssessment(snapshot, answers, completedAt, form),
      );
      return { profile, saved };
    },
  };
}
