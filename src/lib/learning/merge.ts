import { snapshotSchema, type LearningSnapshot } from './snapshot.ts';

/** User-requested union: preserve local cards and include the other device's cards. */
export function mergeLearningSnapshots(
  local: LearningSnapshot,
  remote: LearningSnapshot,
): LearningSnapshot {
  const items = new Map(remote.progress.items.map((item) => [item.id, item]));
  for (const item of local.progress.items) {
    const previous = items.get(item.id);
    if (!previous || item.correct + item.incorrect >= previous.correct + previous.incorrect)
      items.set(item.id, item);
  }
  const activity = new Map(
    [...remote.activity, ...local.activity].map((event) => [event.id, event]),
  );
  const assessments = new Map(
    [...remote.assessments, ...local.assessments].map((assessment) => [
      JSON.stringify(assessment),
      assessment,
    ]),
  );
  return snapshotSchema.parse({
    progress: {
      items: [...items.values()],
      contextCorrect: Math.max(local.progress.contextCorrect, remote.progress.contextCorrect),
      contextIncorrect: Math.max(local.progress.contextIncorrect, remote.progress.contextIncorrect),
    },
    activity: [...activity.values()].sort((a, b) => a.at - b.at).slice(-5000),
    assessments: [...assessments.values()].sort((a, b) => a.completedAt - b.completedAt).slice(-30),
  });
}
