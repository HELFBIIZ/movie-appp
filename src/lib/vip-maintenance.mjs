import {
  listVipReminderCandidates,
  listRecentlyExpiredVip,
  hasNotificationToday,
  createNotification,
  expireStaleSubscriptions,
} from '../db/index.mjs';

let lastRunAt = 0;
const INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function runVipMaintenance({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastRunAt < INTERVAL_MS) return { skipped: true };
  lastRunAt = now;

  let reminded = 0;
  for (const row of await listVipReminderCandidates()) {
    const days = Math.max(
      0,
      Math.ceil((new Date(row.expiresAt).getTime() - Date.now()) / 86_400_000),
    );
    const title = days <= 1 ? 'VIP эрхээ дуусахад байна' : 'VIP эрхээ сунгаарай';
    if (await hasNotificationToday(row.userId, title)) continue;
    await createNotification({
      userId: row.userId,
      type: 'vip_renewal',
      title,
      body: `Таны ${row.planCode} VIP эрх ${new Date(row.expiresAt).toLocaleDateString()} дуусна. Одоо сунгаарай.`,
      link: '/pricing',
    });
    reminded++;
  }

  let expiredNotified = 0;
  for (const row of await listRecentlyExpiredVip()) {
    const title = 'Таны VIP эрх дууслаа';
    if (await hasNotificationToday(row.userId, title)) continue;
    await createNotification({
      userId: row.userId,
      type: 'vip_expired',
      title,
      body: 'Дахин үзэхийн тулд VIP багцаа сунгаарай.',
      link: '/pricing',
    });
    expiredNotified++;
  }

  const expired = await expireStaleSubscriptions();
  return { ok: true, reminded, expiredNotified, expired };
}
