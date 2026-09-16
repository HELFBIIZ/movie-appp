// B10 — REAL end-to-end db slice, server-side lib only (no invented names).
import {
  getDb, hashSecret, verifySecret,
  createUser, getActiveSubscription, canWatch,
} from '../src/lib/db.mjs'

const db = await getDb()
const boot = {
  tables: (await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  )).rows.map(r => r.name),
}
console.log('BOOT tables →', boot.tables.join(', '))

const pw = 'correct horse battery staple'
const stored = hashSecret(pw)
console.log('SCRYPT roundtrip → ok:', verifySecret(stored, pw), '| wrong rejected:', !verifySecret(stored, 'nope'))

const c = await createUser({ email: `probe_${Date.now()}@example.com`, username: `u_${Date.now().toString(36)}`, password: pw })
console.log('CREATE → userId:', c?.user?.id?.slice(0, 8), '| email:', c?.user?.email, '| roleId:', c?.user?.roleId)

const sub = await getActiveSubscription(c.user.id)
console.log('GET_ACTIVE_SUBSCRIPTION on fresh user → (expected null):', sub)

const free = { access: 'FREE' }
const paid = { access: 'SUBSCRIPTION' }
console.log('canWatch FREE →', JSON.stringify(await canWatch(c.user.id, free)))
console.log('canWatch PAID w/o sub →', JSON.stringify(await canWatch(c.user.id, paid)))
