import 'server-only';
import { getDb } from './index.mjs';
import { emptySnapshot, type LearningSnapshot } from '../lib/learning/snapshot';

let ready: Promise<void> | undefined;
async function database() {
  const client = await getDb();
  ready ??= client
    .executeMultiple(
      `
    CREATE TABLE IF NOT EXISTS learning_states (user_id TEXT PRIMARY KEY REFERENCES users(id), revision INTEGER NOT NULL DEFAULT 0, body TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS learning_captions (media_key TEXT PRIMARY KEY, body TEXT NOT NULL, expires_at INTEGER NOT NULL);
  `,
    )
    .catch((error: unknown) => {
      ready = undefined;
      throw error;
    });
  await ready;
  return client;
}
export async function readLearningState(userId: string) {
  const client = await database();
  const row = (
    await client.execute({
      sql: 'SELECT revision, body FROM learning_states WHERE user_id = ?',
      args: [userId],
    })
  ).rows[0];
  return row
    ? { revision: Number(row.revision), snapshot: JSON.parse(String(row.body)) as unknown }
    : { revision: 0, snapshot: emptySnapshot() };
}
export async function writeLearningState(
  userId: string,
  revision: number,
  snapshot: LearningSnapshot,
) {
  const client = await database();
  const result = await client.execute({
    sql: `INSERT INTO learning_states (user_id, revision, body) SELECT ?, 1, ? WHERE ? = 0
      ON CONFLICT(user_id) DO UPDATE SET revision = learning_states.revision + 1, body = excluded.body, updated_at = datetime('now') WHERE learning_states.revision = ?`,
    args: [userId, JSON.stringify(snapshot), revision, revision],
  });
  // Existing rows need an UPDATE even when the caller's revision is nonzero.
  if (!result.rowsAffected && revision > 0) {
    const update = await client.execute({
      sql: "UPDATE learning_states SET revision = revision + 1, body = ?, updated_at = datetime('now') WHERE user_id = ? AND revision = ?",
      args: [JSON.stringify(snapshot), userId, revision],
    });
    return update.rowsAffected === 1;
  }
  return result.rowsAffected === 1;
}
export async function readCaptionCache(key: string): Promise<unknown | null> {
  const client = await database();
  const row = (
    await client.execute({
      sql: 'SELECT body FROM learning_captions WHERE media_key = ? AND expires_at > ?',
      args: [key, Date.now()],
    })
  ).rows[0];
  return row ? (JSON.parse(String(row.body)) as unknown) : null;
}
export async function writeCaptionCache(key: string, value: unknown, lifetimeMs: number) {
  const client = await database();
  await client.execute({
    sql: 'INSERT INTO learning_captions (media_key, body, expires_at) VALUES (?, ?, ?) ON CONFLICT(media_key) DO UPDATE SET body = excluded.body, expires_at = excluded.expires_at',
    args: [key, JSON.stringify(value), Date.now() + lifetimeMs],
  });
}
