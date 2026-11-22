import type { LearningSnapshot } from './snapshot.ts';
const DAY = 86_400_000;
export function learningMetrics(snapshot: LearningSnapshot, now: number) {
  const reviews = snapshot.activity.filter((event) => event.kind === 'review');
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
    const events = snapshot.activity.filter((event) => dayKey(event.at) === key);
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
    seconds: snapshot.activity
      .filter((event) => event.kind === 'listen')
      .reduce((sum, event) => sum + (event.seconds ?? 0), 0),
    recentRate: rate(recent),
    previousRate: rate(previous),
    recentCount: recent.length,
    previousCount: previous.length,
    todayWords: snapshot.progress.items.filter(
      (item) => item.kind === 'word' && dayKey(item.savedAt) === today,
    ).length,
    days,
  };
}
