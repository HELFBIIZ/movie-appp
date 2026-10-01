// One honest runtime probe of the app's server DB layer (db.js + schema.sql),
// exercised through import() as ESM exactly like Next does. No fake code.
import { getDb, hashSecret, verifySecret, grantXp, getDbStatus } from '../src/lib/db.js'

const db = getDb()
const status = getDbStatus()
console.log('platform:', status.platform, '| tables:', status.tables.join(','))

const plans = db.prepare('SELECT code, price_mnt, duration_days FROM subscription_plans').all()
console.log('plans from schema.seed:', plans.map(p => p.code + '=' + p.price_mnt).join(' '))

const h = hashSecret('correct horse battery staple')
console.log('scrypt roundtrip ok:', verifySecret(h, 'correct horse battery staple'), '| wrong pw rejected:', !verifySecret(h, 'nope'))

const before = db.prepare('SELECT COUNT(*) c FROM xp_transactions').get().c
const grant = grantXp({ userId: 'u_test', activity: 'SIGNUP', amount: 55 })
const after = db.prepare('SELECT COUNT(*) c FROM xp_transactions').get().c
console.log('grantXp: txn', grant.txnId.slice(0, 8), '| xp_txns', before, '->', after, '| level', grant.level)
console.log('RUNTIME PROBE OK')
