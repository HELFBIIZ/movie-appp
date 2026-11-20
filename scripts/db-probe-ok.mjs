import {
  getDb, hashSecret, verifySecret,
  createUser, requireUser, requireRole,
  rateLimit, getActiveSubscription, canWatch,
} from '../src/lib/db.mjs'

const db = await getDb()
const tables = (await db.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
)).rows.map(r => r.name)
console.log('TABLES on disk:', tables.join(', '))
console.log('PLANS:',
  (await db.execute('SELECT code, price_mnt FROM subscription_plans ORDER BY price_mnt'))
    .rows.map(p => p.code + '=' + p.price_mnt).join(' '))

const stored = hashSecret('entropy-34 brilliant lamp')
console.log('scrypt ok:', verifySecret(stored, 'entropy-34 brilliant lamp'),
            '| wrong:', !verifySecret(stored, 'brilliant-34 entropy lamp'))

const make = await createUser({ email: 'probe_' + Date.now() + '@x.com', username: 'probe_t' + Date.now() % 100000, password: 'entropy-34 brilliant lamp' })
console.log('CREATE →', make.user ? 'id=' + make.user.id.slice(0, 8) : JSON.stringify(make.error))

const sub = await getActiveSubscription(make.user.id)
console.log('active sub on fresh user →', sub === null ? 'null (correct)' : 'UNEXPECTED')

const free = { id: 'm_free', access: 'FREE' }
const paid = { id: 'm_paid', access: 'SUBSCRIPTION' }
console.log('canWatch FREE →', JSON.stringify(await canWatch(make.user.id, free)))
console.log('canWatch PAID no-sub →', JSON.stringify(await canWatch(make.user.id, paid)).slice(0, 70))

const rl = rateLimit('probe:' + Date.now(), { max: 3 })
console.log('rateLimit [1/3] limited:', rl.limited, '| remaining:', rl.remaining)
