// fix-merchant-two.mjs — byte-exact, git-free dedupe, then BUILD.
// Ground truth from raw greps: db.mjs has createMerchantApplication at TWO
// offsets (256 + 293); schema.sql has merchant_applications CREATE at TWO
// offsets. Keep the FIRST complete block of each, delete the SECOND.
// Verdicts printed are counts after edit (must be exactly 1 each) — and the
// build result after that is the only thing I show as "green"/"not".
import { readFileSync, writeFileSync } from 'fs'

function blockAfter(s, mark) {
  const i = s.indexOf(mark)
  if (i === -1) throw new Error('seam vanished: ' + mark)
  let open = s.indexOf('{', i)
  let depth = 0
  for (let j = open; j < s.length; j++) {
    if (s[j] === '{') depth++
    else if (s[j] === '}') { depth--; if (depth === 0) return j + 1 }
  }
  throw new Error('unclosed block: ' + mark)
}

// ---- 1: db.mjs — keep first `export function createMerchantApplication`
let d = readFileSync('src/lib/db.mjs', 'utf8')
const mk = 'export function createMerchantApplication'
const a1 = d.indexOf(mk)
const a2 = d.indexOf(mk, a1 + 1)
if (a1 === -1 || a2 === -1) throw new Error('db mark gone ' + a1 + '/' + a2)
const a2End = blockAfter(d, mk) // FIRST block end; keep [a1..a2End)
const dEnd = (() => { let r = d.slice(a2End); const e = r.indexOf('\nexport '); return e === -1 ? r.length : e })()
d = d.slice(0, a1) + d.slice(a2End + dEnd)
writeFileSync('src/lib/db.mjs', d)
const dCount = (d.match(/export function createMerchantApplication/g) || []).length
console.log('db.mjs createMerchantApplication now:', dCount, '(must be 1)')

// ---- 2: schema.sql — keep first CREATE block
let s = readFileSync('data/db/schema.sql', 'utf8')
const mk2 = 'CREATE TABLE IF NOT EXISTS merchant_applications'
const m1 = s.indexOf(mk2)
const m2 = s.indexOf(mk2, m1 + 1)
if (m1 === -1 || m2 === -1) throw new Error('schema mark gone ' + m1 + '/' + m2)
const m1End = blockAfter(s, mk2)
s = s.slice(0, m1) + s.slice(m1End)
writeFileSync('data/db/schema.sql', s)
const sCount = (s.match(/CREATE TABLE IF NOT EXISTS merchant_applications/g) || []).length
console.log('schema merchant_applications now:', sCount, '(must be 1)')
