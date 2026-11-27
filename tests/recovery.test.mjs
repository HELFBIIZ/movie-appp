import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@libsql/client';
import {
  assessPlacement,
  placementForms,
  nextPlacementForm,
} from '../src/lib/learning/placement.ts';
import { addAssessment, emptySnapshot, snapshotSchema } from '../src/lib/learning/snapshot.ts';
import { mergeLearningSnapshots } from '../src/lib/learning/merge.ts';
import { saveLearningState } from '../src/db/learning-state.mjs';
import {
  checkoutRequest,
  recentCheckoutRequests,
  saveCheckoutUrl,
} from '../src/db/payment-fulfillment.mjs';
import { recoveryPaymentSchema } from '../src/lib/payments/recovery.ts';

const correct = (form) =>
  Object.fromEntries(placementForms[form].map((question) => [question.id, question.answer]));
test('parallel placement forms have different questions and matching skill/difficulty coverage', () => {
  assert.equal(placementForms.b.length, 8);
  assert.equal(assessPlacement(correct('b'), 1, 'b').correct, 8);
  assert.equal(assessPlacement(correct('b'), 1, 'b').band, 'intermediate');
  const coverage = (form) =>
    placementForms[form].map((question) => `${question.skill}:${question.difficulty}`).sort();
  assert.deepEqual(coverage('a'), coverage('b'));
  assert.equal(
    placementForms.b.some((question) =>
      placementForms.a.some(
        (original) => original.id === question.id || original.context === question.context,
      ),
    ),
    false,
  );
  assert.throws(() => assessPlacement(correct('a'), 1, 'b'));
  assert.throws(() => assessPlacement(correct('b'), 1));
  assert.throws(() => assessPlacement(correct('b'), 1, 'unknown'));
  assert.deepEqual(
    [nextPlacementForm(), nextPlacementForm('a'), nextPlacementForm('b')],
    ['a', 'b', 'a'],
  );
});
test('alternative answers stay outside the legacy history and device merge deduplicates them', () => {
  const first = addAssessment(emptySnapshot(), correct('a'), 1);
  const second = addAssessment(first, correct('b'), 2, 'b');
  assert.equal(second.assessments.length, 1);
  assert.equal(second.retests.length, 1);
  assert.equal(assessPlacement(second.assessments[0].answers, 1).correct, 8);
  assert.ok(snapshotSchema.safeParse(second).success);
  const legacy = snapshotSchema.omit({ retests: true }).parse(second);
  assert.equal(legacy.retests, undefined);
  assert.ok(snapshotSchema.safeParse(legacy).success);
  const merged = mergeLearningSnapshots(second, second);
  assert.equal(merged.assessments.length, 1);
  assert.equal(merged.retests.length, 1);
  assert.equal(
    snapshotSchema.safeParse({
      ...second,
      retests: [{ ...second.retests[0], answers: correct('a') }],
    }).success,
    false,
  );
});
test('an older client cannot erase alternative tests; explicit clearing and revision conflicts still work', async () => {
  const db = createClient({ url: ':memory:' });
  try {
    await db.execute(
      "CREATE TABLE learning_states (user_id TEXT PRIMARY KEY, revision INTEGER, body TEXT, updated_at TEXT DEFAULT (datetime('now')))",
    );
    const snapshot = addAssessment(emptySnapshot(), correct('b'), 1, 'b');
    assert.equal(await saveLearningState(db, 'alice', 0, snapshot), true);
    const legacy = snapshotSchema.omit({ retests: true }).parse(snapshot);
    legacy.progress.contextCorrect = 3;
    assert.equal(await saveLearningState(db, 'alice', 1, legacy), true);
    const read = async () =>
      JSON.parse(
        String(
          (await db.execute("SELECT body FROM learning_states WHERE user_id='alice'")).rows[0].body,
        ),
      );
    assert.equal((await read()).retests.length, 1);
    assert.equal((await read()).progress.contextCorrect, 3);
    assert.equal(await saveLearningState(db, 'alice', 1, { ...legacy, retests: [] }), false);
    assert.equal((await read()).retests.length, 1);
    assert.equal(await saveLearningState(db, 'alice', 2, { ...legacy, retests: [] }), true);
    assert.deepEqual((await read()).retests, []);
    const attempts = await Promise.all([
      saveLearningState(db, 'alice', 3, snapshot),
      saveLearningState(db, 'alice', 3, snapshot),
    ]);
    assert.equal(attempts.filter(Boolean).length, 1);
    assert.equal(await saveLearningState(db, 'bob', 3, snapshot), false);
  } finally {
    db.close();
  }
});
test('payment recovery lists only owned recent Wire rows and does not create or fulfill payments', async () => {
  const db = createClient({ url: ':memory:' });
  try {
    await db.executeMultiple(
      "CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('alice'),('bob'); CREATE TABLE subscription_plans(id TEXT PRIMARY KEY,name TEXT); INSERT INTO subscription_plans VALUES('monthly','Monthly'); CREATE TABLE payments(id TEXT PRIMARY KEY,txn_id TEXT UNIQUE,user_id TEXT,plan_id TEXT,amount_mnt INTEGER,currency TEXT,status TEXT,provider TEXT);",
    );
    const create = (key, userId = 'alice', provider = 'wire') =>
      checkoutRequest(db, {
        userId,
        requestKey: key,
        planId: 'monthly',
        amountMnt: 5900,
        provider,
        returnTo: '/watch/inception?learn=1',
      });
    const first = await create('first');
    await saveCheckoutUrl(db, 'alice', first.txnId, 'https://pay.wire.mn/c/cs_owned');
    const old = await create('old');
    await db.execute({
      sql: "UPDATE checkout_requests SET created_at=datetime('now','-2 days') WHERE txn_id=?",
      args: [old.txnId],
    });
    const failed = await create('failed');
    await db.execute({
      sql: "UPDATE payments SET status='FAILED' WHERE txn_id=?",
      args: [failed.txnId],
    });
    const other = await create('other', 'bob');
    await create('bank', 'alice', 'bank');
    const paid = await create('paid');
    await db.execute({
      sql: "UPDATE payments SET status='SUCCESSFUL' WHERE txn_id=?",
      args: [paid.txnId],
    });
    const before = Number((await db.execute('SELECT COUNT(*) AS n FROM payments')).rows[0].n);
    const rows = await recentCheckoutRequests(db, 'alice');
    assert.deepEqual(new Set(rows.map((row) => row.txnId)), new Set([first.txnId, paid.txnId]));
    assert.ok(rows.every((row) => row.txnId !== other.txnId));
    assert.equal((await recentCheckoutRequests(db, 'bob'))[0].txnId, other.txnId);
    assert.equal(
      Number((await db.execute('SELECT COUNT(*) AS n FROM payments')).rows[0].n),
      before,
    );
    assert.equal(
      (await db.execute({ sql: 'SELECT status FROM payments WHERE txn_id=?', args: [first.txnId] }))
        .rows[0].status,
      'PENDING',
    );
  } finally {
    db.close();
  }
});
test('recovery normalizes destinations and suppresses foreign checkout URLs using the existing URL policy', () => {
  const payment = {
    txnId: 'tx_12345678-1234-1234-1234-123456789abc',
    status: 'PENDING',
    planName: 'Monthly',
    amountMnt: 5900,
    returnTo: 'https://evil.test',
    checkoutUrl: 'https://evil.test/c/cs_evil',
  };
  const parsed = recoveryPaymentSchema.parse(payment);
  assert.equal(parsed.returnTo, '/learning');
  assert.equal(parsed.checkoutUrl, null);
  assert.equal(
    recoveryPaymentSchema.parse({
      ...payment,
      checkoutUrl: 'https://pay.wire.mn/c/cs_owned?lang=mn',
    }).checkoutUrl,
    'https://pay.wire.mn/c/cs_owned?lang=mn',
  );
  assert.equal(recoveryPaymentSchema.safeParse({ ...payment, status: 'INVENTED' }).success, false);
});
