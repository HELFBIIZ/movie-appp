import assert from 'node:assert/strict';

// Parent process supplies an empty temporary CWD and removes every remote DB setting.
globalThis.fetch = () => {
  throw new Error('Network is forbidden in the store regression fixture');
};
const db = await import(process.argv[2]);
const client = await db.getDb();
try {
  const created = await db.createUser({
    email: 'learner@example.test',
    username: 'learner',
    password: 'fixture-only-password',
  });
  assert.equal(created.xp.gained, 50);
  assert.equal(
    (
      await db.createUser({
        email: 'learner@example.test',
        username: 'other',
        password: 'fixture-only-password',
      })
    ).error,
    'EMAIL_TAKEN',
  );
  const user = await db.findUserForLogin('learner');
  assert.equal(db.verifySecret(user.passwordHash, 'fixture-only-password'), true);
  assert.equal(db.verifySecret(user.passwordHash, 'wrong-password'), false);
  const session = await db.createSession(created.user.id);
  assert.equal((await db.requireUser(session.token)).user.id, created.user.id);
  assert.equal((await db.requireRole(session.token, 'ADMIN')).error.code, 'FORBIDDEN');
  assert.equal((await db.requireUser('unknown')).error.code, 'UNAUTHENTICATED');
  await db.updateProfile(created.user.id, {
    displayName: 'Learner',
    bio: 'Test bio',
    avatarUrl: null,
  });
  assert.equal((await db.getProfile(created.user.id)).bio, 'Test bio');
  assert.equal((await db.toggleFavorite(created.user.id, 'inception')).favorited, true);
  assert.equal((await db.listFavorites(created.user.id))[0].movieId, 'inception');
  assert.equal((await db.toggleFavorite(created.user.id, 'inception')).favorited, false);
  assert.deepEqual(await db.listFavorites(created.user.id), []);
  assert.equal((await db.canWatch(created.user.id, { access: 'VIP' })).allowed, false);
  const plan = (await db.listSubscriptionPlans()).find((item) => item.code === 'MONTHLY');
  const payment = await db.createPayment({
    userId: created.user.id,
    planId: plan.id,
    amountMnt: plan.priceMnt,
    provider: 'local_dev',
  });
  assert.equal(payment.status, 'PENDING');
  const activated = await db.activatePaymentSuccess(payment.txnId);
  assert.equal(activated.payment.status, 'SUCCESSFUL');
  assert.equal((await db.canWatch(created.user.id, { access: 'VIP' })).allowed, true);
  assert.equal((await db.activatePaymentSuccess(payment.txnId)).alreadyActivated, true);
  assert.equal(
    (await client.execute('SELECT COUNT(*) AS count FROM subscriptions')).rows[0].count,
    1,
  );
  await db.deleteSession(session.token);
  assert.equal((await db.requireUser(session.token)).error.code, 'UNAUTHENTICATED');
  assert.equal(db.rateLimit('fixture', { max: 1 }).limited, false);
  assert.equal(db.rateLimit('fixture', { max: 1 }).limited, true);
  process.stdout.write(
    'signup/session/role/logout/profile/favorites/VIP/payment-idempotency/rate-limit passed\n',
  );
} finally {
  client.close();
}
