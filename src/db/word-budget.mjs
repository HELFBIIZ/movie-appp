export async function reserveWordLookup(
  client,
  characters,
  day = new Date().toISOString().slice(0, 10),
) {
  await client.execute(
    'CREATE TABLE IF NOT EXISTS learning_word_usage (day TEXT PRIMARY KEY, characters INTEGER NOT NULL)',
  );
  const result = await client.execute({
    sql: 'INSERT INTO learning_word_usage(day,characters) SELECT ?,? WHERE ? BETWEEN 1 AND 3000 ON CONFLICT(day) DO UPDATE SET characters=learning_word_usage.characters+excluded.characters WHERE learning_word_usage.characters+excluded.characters<=3000',
    args: [day, characters, characters],
  });
  return result.rowsAffected === 1;
}
