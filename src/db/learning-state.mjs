export async function saveLearningState(client, userId, revision, snapshot) {
  const body = JSON.stringify(snapshot);
  // Merge only validated fields present in the request. Older clients omit optional
  // extensions; they must not erase retests stored by a newer client.
  const result = await client.execute({
    sql: `INSERT INTO learning_states (user_id, revision, body) SELECT ?, 1, ? WHERE ? = 0
      ON CONFLICT(user_id) DO UPDATE SET revision = learning_states.revision + 1,
      body = json_patch(learning_states.body, excluded.body), updated_at = datetime('now')
      WHERE learning_states.revision = ?`,
    args: [userId, body, revision, revision],
  });
  if (!result.rowsAffected && revision > 0) {
    const update = await client.execute({
      sql: "UPDATE learning_states SET revision = revision + 1, body = json_patch(body, ?), updated_at = datetime('now') WHERE user_id = ? AND revision = ?",
      args: [body, userId, revision],
    });
    return update.rowsAffected === 1;
  }
  return result.rowsAffected === 1;
}
