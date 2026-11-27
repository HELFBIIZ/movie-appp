import { z } from 'zod';
import { decodeProgress, emptyProgress } from './storage.ts';
import { assessPlacement, type PlacementAnswers, type PlacementForm } from './placement.ts';

export const activitySchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['review', 'context', 'listen']),
  at: z.number().int().nonnegative(),
  movieId: z.string().max(200),
  correct: z.boolean().optional(),
  seconds: z.number().finite().min(0).max(30).optional(),
});
export const assessmentSchema = z
  .object({
    answers: z.record(z.string(), z.string().nullable()),
    completedAt: z.number().int().nonnegative(),
  })
  .superRefine((value, context) => {
    try {
      assessPlacement(value.answers, value.completedAt);
    } catch {
      context.addIssue({ code: 'custom', message: 'Invalid assessment' });
    }
  });
export const snapshotSchema = z.object({
  progress: z.unknown().transform((value, context) => {
    try {
      return decodeProgress(JSON.stringify(value));
    } catch {
      context.addIssue({ code: 'custom', message: 'Invalid progress' });
      return z.NEVER;
    }
  }),
  assessments: z.array(assessmentSchema).max(30),
  // Optional extension: old clients must continue to see only valid form-A answers.
  retests: z
    .array(
      z
        .object({
          form: z.literal('b'),
          answers: z.record(z.string(), z.string().nullable()),
          completedAt: z.number().int().nonnegative(),
        })
        .superRefine((value, context) => {
          try {
            assessPlacement(value.answers, value.completedAt, value.form);
          } catch {
            context.addIssue({ code: 'custom', message: 'Invalid retest' });
          }
        }),
    )
    .max(30)
    .optional(),
  activity: z.array(activitySchema).max(5000),
});
export type LearningSnapshot = z.infer<typeof snapshotSchema>;
export const emptySnapshot = (): LearningSnapshot => ({
  progress: emptyProgress(),
  assessments: [],
  activity: [],
});
export const snapshotKey = (scope: string) => `vxnta.learning.${scope}.v2`;
export const envelopeSchema = z.object({
  snapshot: snapshotSchema,
  revision: z.number().int().nonnegative(),
  dirty: z.boolean(),
});
export function addAssessment(
  snapshot: LearningSnapshot,
  answers: PlacementAnswers,
  completedAt: number,
  form: PlacementForm = 'a',
): LearningSnapshot {
  assessPlacement(answers, completedAt, form);
  if (form === 'b')
    return {
      ...snapshot,
      retests: [...(snapshot.retests ?? []), { form, answers, completedAt }].slice(-30),
    };
  return {
    ...snapshot,
    assessments: [...snapshot.assessments, { answers, completedAt }].slice(-30),
  };
}
export function listenedSeconds(
  previous: { media: number; wall: number } | null,
  media: number,
  wall: number,
): number {
  if (!previous || !Number.isFinite(media) || !Number.isFinite(wall)) return 0;
  const delta = media - previous.media;
  const elapsed = (wall - previous.wall) / 1000;
  // Seeks, paused/stale clocks and hidden-tab catch-up never count as study time.
  return delta > 0 && elapsed > 0 && elapsed <= 4 && delta <= elapsed * 1.6
    ? Math.min(delta, elapsed)
    : 0;
}
