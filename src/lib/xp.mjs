import crypto from 'crypto';
import { getDb } from '../db/index.mjs';
import { levelForXp } from './xp-levels.mjs';

export { levelForXp, levelProgress } from './xp-levels.mjs';

let eventKeyAvailable = null;
async function hasEventKeyColumn(client) {
  if (eventKeyAvailable !== null) return eventKeyAvailable;
  try {
    await client.execute('SELECT event_key FROM xp_transactions LIMIT 0');
    eventKeyAvailable = true;
  } catch {
    eventKeyAvailable = false;
  }
  return eventKeyAvailable;
}

const XP_RULES = Object.freeze({
  VIDEO_VIEW: { amount: 20, daily: 120 },
  SUBTITLE_HELP: { amount: 15, daily: 60 },
  RATING: { amount: 10, daily: 50 },
  REVIEW: { amount: 30, daily: 150 },
  SHARE_REF: { amount: 40, daily: 40 },
  PROFILE_PIC: { amount: 25, daily: 25 },
  DAILY_LOGIN: { amount: 10, daily: 10 },
  WORD_LEARNED: { amount: 5, daily: 50 },
  COMMENT: { amount: 15, daily: 90 },
  ADMIN_ADJUST: { amount: 0, daily: 5000, allowAmount: true },
});

export async function awardXp({ userId, activity, eventKey = null, amount }) {
  const rule = XP_RULES[activity];
  if (!rule || !userId) return { error: { code: 'UNKNOWN_ACTIVITY' } };

  let earned = rule.amount;
  if (rule.allowAmount) {
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 500)
      return { error: { code: 'INVALID_AMOUNT' } };
    earned = amount;
  }
  if (!earned) return { error: { code: 'INVALID_AMOUNT' } };

  const client = await getDb();
  const usableEventKey = eventKey && (await hasEventKeyColumn(client)) ? eventKey : null;
  if (usableEventKey) {
    const existing = (
      await client.execute({
        sql: `SELECT amount FROM xp_transactions WHERE event_key = ? LIMIT 1`,
        args: [usableEventKey],
      })
    ).rows[0];
    if (existing) return { already: true, gained: 0, userId };
  }

  const count =
    (
      await client.execute({
        sql: `SELECT COUNT(*) AS n FROM xp_transactions
            WHERE user_id = ? AND activity = ? AND amount > 0
              AND created_at >= datetime('now', '-1 day')`,
        args: [userId, activity],
      })
    ).rows[0]?.n ?? 0;
  const cap = rule.allowAmount ? 20 : Math.ceil(rule.daily / rule.amount);
  if (earned > 0 && count >= cap) return { error: { code: 'XP_DAILY_CAP', retryAfterIn: 86400 } };

  const before = (
    await client.execute({
      sql: 'SELECT xp, level FROM xp_accounts WHERE user_id = ?',
      args: [userId],
    })
  ).rows[0] ?? { xp: 0, level: 1 };
  const nextXp = Math.max(0, Number(before.xp || 0) + earned);
  const level = levelForXp(nextXp);

  try {
    await client.batch(
      [
        {
          sql: `INSERT OR IGNORE INTO xp_accounts (id, user_id) VALUES (?, ?)`,
          args: [crypto.randomUUID(), userId],
        },
        {
          sql: `UPDATE xp_accounts SET xp = ?, level = ?,
                  streak_days = COALESCE((SELECT current FROM login_streaks WHERE user_id = ?), streak_days),
                  last_streak_date = COALESCE((SELECT last_login_date FROM login_streaks WHERE user_id = ?), last_streak_date),
                  updated_at = datetime('now')
                WHERE user_id = ?`,
          args: [nextXp, level, userId, userId, userId],
        },
        {
          sql: usableEventKey
            ? `INSERT INTO xp_transactions (id, user_id, activity, amount, reason, event_key, created_at)
               VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
            : `INSERT INTO xp_transactions (id, user_id, activity, amount, reason, created_at)
               VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          args: usableEventKey
            ? [crypto.randomUUID(), userId, activity, earned, activity, usableEventKey]
            : [crypto.randomUUID(), userId, activity, earned, activity],
        },
      ],
      'write',
    );
  } catch {
    if (usableEventKey) return { already: true, gained: 0, userId };
    return { error: { code: 'XP_WRITE_FAILED' } };
  }

  return {
    user: userId,
    gained: earned,
    xp: nextXp,
    level,
    from: before.xp,
    leveledUp: level > before.level,
  };
}

export async function flipLoginStreak({ userId, date = new Date().toISOString().slice(0, 10) }) {
  const client = await getDb();
  const row =
    (
      await client.execute({
        sql: `SELECT current, last_login_date AS lastDate FROM login_streaks WHERE user_id = ?`,
        args: [userId],
      })
    ).rows[0] || null;
  const today = date;
  if (row && row.lastDate === today) return { flipped: false, reason: 'ALREADY_TODAY' };
  const current = row && row.lastDate === yesterdayOf(today) ? row.current + 1 : 1;
  await client.batch(
    [
      {
        sql: `INSERT OR IGNORE INTO login_streaks (id, user_id, current, best, last_login_date)
              VALUES (?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), userId, current, current, today],
      },
      {
        sql: `UPDATE login_streaks SET current = ?, best = MAX(best, ?), last_login_date = ? WHERE user_id = ?`,
        args: [current, current, today, userId],
      },
    ],
    'write',
  );
  return { flipped: true, current, date: today };
}

function yesterdayOf(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
