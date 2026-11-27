import type { LearningSnapshot } from './snapshot.ts';
const DAY = 86_400_000;
export function learningMetrics(snapshot: LearningSnapshot, now: number) {
  const activity = snapshot.activity.filter((event) => event.at <= now);
  const reviews = activity.filter((event) => event.kind === 'review');
  const window = (start: number, end: number) =>
    reviews.filter((event) => event.at >= start && event.at < end);
  const rate = (events: typeof reviews) =>
    events.length
      ? Math.round((100 * events.filter((event) => event.correct).length) / events.length)
      : null;
  const recent = window(now - 7 * DAY, now + 1);
  const previous = window(now - 14 * DAY, now - 7 * DAY);
  const dayKey = (at: number) =>
    new Date(at).toLocaleDateString('en-CA', { timeZone: 'Asia/Ulaanbaatar' });
  const today = dayKey(now);
  const days = Array.from({ length: 14 }, (_, index) => {
    const key = dayKey(now - (13 - index) * DAY);
    const events = activity.filter((event) => dayKey(event.at) === key);
    return {
      key,
      seconds: events
        .filter((event) => event.kind === 'listen')
        .reduce((sum, event) => sum + (event.seconds ?? 0), 0),
      reviews: events.filter((event) => event.kind === 'review').length,
    };
  });
  return {
    words: snapshot.progress.items.filter((item) => item.kind === 'word').length,
    retained: snapshot.progress.items.filter((item) => item.kind === 'word' && item.stage >= 2)
      .length,
    due: snapshot.progress.items.filter((item) => item.kind === 'word' && item.dueAt <= now),
    todayReviews: reviews.filter((event) => dayKey(event.at) === today && event.at <= now).length,
    todaySeconds: days.at(-1)?.seconds ?? 0,
    streak: (() => {
      const active = new Set(
        activity
          .filter(
            (event) =>
              event.at <= now &&
              (event.kind === 'review' || (event.kind === 'listen' && (event.seconds ?? 0) > 0)),
          )
          .map((event) => dayKey(event.at)),
      );
      let offset = active.has(today) ? 0 : 1;
      let count = 0;
      while (active.has(dayKey(now - offset * DAY))) {
        count++;
        offset++;
      }
      return count;
    })(),
    seconds: activity
      .filter((event) => event.kind === 'listen')
      .reduce((sum, event) => sum + (event.seconds ?? 0), 0),
    recentRate: rate(recent),
    previousRate: rate(previous),
    recentCount: recent.length,
    previousCount: previous.length,
    todayWords: snapshot.progress.items.filter(
      (item) => item.kind === 'word' && item.savedAt <= now && dayKey(item.savedAt) === today,
    ).length,
    days,
  };
}
