// revert-merchant.mjs — Byte-exact revert of the ONLY merchant surface that
// someone persisted in db.mjs: `createMerchantApplication` at offset 11620
// (proven by last run's own error). Delete that one export block verbatim
// (brace-matched from its mark), remove the merchant page + API dirs I wrote,
// leave schema.sql 100% untouched (it has 0 merchant CREATEs — nothing to
// remove), then let the caller run the ONE deciding build.
import { readFileSync, writeFileSync, existsSync, rmSync } from 'fs'

// ---- 1) db.mjs: strip exactly ONE createMerchantApplication block
let d = readFileSync('src/lib/db.mjs', 'utf8')
const mark = 'export function createMerchantApplication'
const i = d.indexOf(mark)
if (i === -1) {
  console.log('db.mjs: createMerchantApplication = 0 (already absent) — nothing to strip')
} else {
  // brace-match: from the first { after the mark to its matching }
  let depth = 0
  let j = d.indexOf('{', i)
  let open = j
  for (; j < d.length; j++) {
    if (d[j] === '{') depth++
    else if (d[j] === '}') { depth--; if (depth === 0) break }
  }
  if (j === d.length) throw new Error('seam broke: no close-brace after ' + i)
  const end = j + 1
  d = d.slice(0, i) + d.slice(end)
  writeFileSync('src/lib/db.mjs', d)
  const remaining = (d.match(/export function createMerchantApplication/g) || []).length
  console.log('db.mjs createMerchantApplication now:', remaining, '(MUST be 0)')
}

// ---- 2) remove the merchant UI + API dirs I created (if present)
for (const p of ['src/app/merchant', 'src/app/api/merchant']) {
  if (existsSync(p)) { rmSync(p, { recursive: true, force: true }); console.log('removed dir:', p) }
  else console.log('already absent:', p)
}

// ---- 3) schema.sql untouched (0 merchant CREATEs proven) — assert only
let s = readFileSync('data/db/schema.sql', 'utf8')
const sCount = (s.match(/CREATE TABLE IF NOT EXISTS merchant_applications/g) || []).length
console.log('schema.sql merchant CREATEs:', sCount, '(leave as-is)')
