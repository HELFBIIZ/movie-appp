import crypto from 'node:crypto';
async function prepare(client) {
  await client.execute(
    'CREATE TABLE IF NOT EXISTS subtitle_translation_jobs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, input_hash TEXT NOT NULL, body TEXT NOT NULL, UNIQUE(user_id, input_hash))',
  );
}
export async function findTranslation(client, userId, inputHash) {
  await prepare(client);
  const row = (
    await client.execute({
      sql: 'SELECT id, body FROM subtitle_translation_jobs WHERE user_id = ? AND input_hash = ?',
      args: [userId, inputHash],
    })
  ).rows[0];
  return row ? { id: String(row.id), ...JSON.parse(String(row.body)) } : null;
}
export async function reserveTranslation(client, userId, inputHash, body) {
  await prepare(client);
  const result = await client.execute({
    sql: 'INSERT INTO subtitle_translation_jobs (id, user_id, input_hash, body) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, input_hash) DO NOTHING',
    args: [crypto.randomUUID(), userId, inputHash, JSON.stringify(body)],
  });
  return {
    created: result.rowsAffected === 1,
    job: await findTranslation(client, userId, inputHash),
  };
}
export async function getTranslation(client, id, userId) {
  await prepare(client);
  const row = (
    await client.execute({
      sql: 'SELECT body FROM subtitle_translation_jobs WHERE id = ? AND user_id = ?',
      args: [id, userId],
    })
  ).rows[0];
  return row ? { id, ...JSON.parse(String(row.body)) } : null;
}
export async function saveTranslation(client, userId, job) {
  await client.execute({
    sql: "UPDATE subtitle_translation_jobs SET body = ? WHERE id = ? AND user_id = ? AND json_extract(body, '$.status') != 'completed'",
    args: [JSON.stringify(job), job.id, userId],
  });
}
export async function translatedContent(client, id) {
  await prepare(client);
  const row = (
    await client.execute({
      sql: 'SELECT body FROM subtitle_translation_jobs WHERE id = ?',
      args: [id],
    })
  ).rows[0];
  if (!row) return null;
  const job = JSON.parse(String(row.body));
  return job.status === 'completed' && typeof job.vtt === 'string' ? job.vtt : null;
}
