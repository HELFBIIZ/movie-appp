import crypto from 'node:crypto';

/** Every decision and the grant execute in one SQLite/libSQL write transaction. */
export async function fulfillPayment(client, txnId) {
  await client.execute(`CREATE TABLE IF NOT EXISTS payment_fulfillments (
    txn_id TEXT PRIMARY KEY REFERENCES payments(txn_id), subscription_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  const subscriptionId = crypto.randomUUID();
  const result = await client.batch(
    [
      {
        sql: `INSERT OR IGNORE INTO payment_fulfillments (txn_id, subscription_id)
      SELECT p.txn_id, ? FROM payments p JOIN subscription_plans plan ON plan.id = p.plan_id
      WHERE p.txn_id = ? AND p.status IN ('PENDING', 'PROCESSING')`,
        args: [subscriptionId, txnId],
      },
      {
        sql: `INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, expires_at)
      SELECT f.subscription_id, p.user_id, p.plan_id, 'ACTIVE', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        strftime('%Y-%m-%dT%H:%M:%fZ', MAX(julianday('now'), COALESCE((SELECT MAX(julianday(s.expires_at)) FROM subscriptions s WHERE s.user_id = p.user_id AND s.status = 'ACTIVE'), 0)) + plan.duration_days)
      FROM payment_fulfillments f JOIN payments p ON p.txn_id = f.txn_id JOIN subscription_plans plan ON plan.id = p.plan_id
      WHERE f.txn_id = ? AND f.subscription_id = ?`,
        args: [txnId, subscriptionId],
      },
      {
        sql: `UPDATE payments SET status = 'SUCCESSFUL', verified_at = datetime('now'), updated_at = datetime('now')
      WHERE txn_id = ? AND EXISTS (SELECT 1 FROM payment_fulfillments WHERE txn_id = ? AND subscription_id = ?)`,
        args: [txnId, txnId, subscriptionId],
      },
      {
        sql: `INSERT INTO payment_methods (id, user_id, provider, token, is_default)
      SELECT 'pm:' || p.user_id || ':' || p.provider, p.user_id, p.provider, COALESCE(p.provider_ref, p.txn_id), 1
      FROM payments p JOIN payment_fulfillments f ON f.txn_id = p.txn_id WHERE f.txn_id = ? AND f.subscription_id = ?
      ON CONFLICT(id) DO UPDATE SET is_default = 1`,
        args: [txnId, subscriptionId],
      },
      {
        sql: `INSERT INTO security_logs (id, user_id, type, detail)
      SELECT ?, p.user_id, 'payment-verify', plan.code || ' activated via ' || p.provider || ' (' || p.txn_id || ')'
      FROM payments p JOIN payment_fulfillments f ON f.txn_id = p.txn_id JOIN subscription_plans plan ON plan.id = p.plan_id
      WHERE f.txn_id = ? AND f.subscription_id = ?`,
        args: [crypto.randomUUID(), txnId, subscriptionId],
      },
    ],
    'write',
  );
  return { activated: result[0].rowsAffected === 1 };
}

async function prepareCheckouts(client) {
  await client.execute(`CREATE TABLE IF NOT EXISTS checkout_requests (
    user_id TEXT NOT NULL REFERENCES users(id), request_key TEXT NOT NULL, txn_id TEXT NOT NULL UNIQUE,
    return_to TEXT NOT NULL, checkout_url TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, request_key))`);
}
export async function recentCheckoutRequests(client, userId) {
  await prepareCheckouts(client);
  return (
    await client.execute({
      sql: `SELECT r.txn_id AS txnId, r.return_to AS returnTo, r.checkout_url AS checkoutUrl,
      r.created_at AS createdAt, p.status, p.amount_mnt AS amountMnt, plan.name AS planName
      FROM checkout_requests r JOIN payments p ON p.txn_id = r.txn_id
      JOIN subscription_plans plan ON plan.id = p.plan_id
      WHERE r.user_id = ? AND p.user_id = ? AND p.provider = 'wire'
      AND p.status IN ('PENDING', 'PROCESSING', 'SUCCESSFUL')
      AND r.created_at >= datetime('now', '-1 day')
      ORDER BY r.created_at DESC, r.rowid DESC LIMIT 3`,
      args: [userId, userId],
    })
  ).rows;
}
export async function checkoutRequest(
  client,
  { userId, requestKey, planId, amountMnt, provider, returnTo },
) {
  await prepareCheckouts(client);
  const txnId = `tx_${crypto.randomUUID()}`;
  await client.batch(
    [
      {
        sql: `INSERT INTO payments (id, txn_id, user_id, plan_id, amount_mnt, currency, status, provider)
      SELECT ?, ?, ?, ?, ?, 'MNT', 'PENDING', ? WHERE NOT EXISTS (SELECT 1 FROM checkout_requests WHERE user_id = ? AND request_key = ?)`,
        args: [crypto.randomUUID(), txnId, userId, planId, amountMnt, provider, userId, requestKey],
      },
      {
        sql: `INSERT OR IGNORE INTO checkout_requests (user_id, request_key, txn_id, return_to)
      SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM payments WHERE txn_id = ?)`,
        args: [userId, requestKey, txnId, returnTo, txnId],
      },
    ],
    'write',
  );
  const row = (
    await client.execute({
      sql: `SELECT r.txn_id AS txnId, r.checkout_url AS checkoutUrl, r.return_to AS returnTo, p.plan_id AS planId, p.provider
    FROM checkout_requests r JOIN payments p ON p.txn_id = r.txn_id WHERE r.user_id = ? AND r.request_key = ?`,
      args: [userId, requestKey],
    })
  ).rows[0];
  if (!row || row.planId !== planId || row.provider !== provider)
    return { error: { code: 'IDEMPOTENCY_CONFLICT' } };
  return row;
}
export async function saveCheckoutUrl(client, userId, txnId, url) {
  await client.execute({
    sql: 'UPDATE checkout_requests SET checkout_url = ? WHERE user_id = ? AND txn_id = ?',
    args: [url, userId, txnId],
  });
}
