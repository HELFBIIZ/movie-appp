// fix-merchant.mjs — the ONE honest dedupe, file-based (no shell mangling).
// Proven ground truth (grep counts): db.mjs has createMerchantApplication at
//   256 and 293 (TWO exports = ESM duplicate identifier = build killer).
//   schema.sql has two CREATE TABLE IF NOT EXISTS merchant_applications.
// Keep the SECOND definition of each (the complete one appended last), delete
// the FIRST. Print remaining-count == 1 as the only acceptable verdict.
import { readFileSync, writeFileSync } from 'fs'

// ---- FIX 1: db.mjs — remove FIRST export block (256.. next top-level export
//      after its closing brace), keep the SECOND at 293.
let d = readFileSync('src/lib/db.mjs', 'utf8')
const mark = 'export function createMerchantApplication'
let first = d.indexOf(mark)
let second = d.indexOf(mark, first + 1)
if (first === -1 || second === -1) throw new Error('seam vanished ' + first + ', ' + second)

function blockEnd(s, fromMark) {
  // from the mark, find the opening brace then brace-match to its close
  let open = s.indexOf('{', fromMark)
  if (open === -1) return s.length
  let depth = 0
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++
    else if (s[i] === '}') { depth--; if (depth === 0) return i + 1 }
  }
  return s.length
}

let firstEnd = blockEnd(d, first)
d = d.slice(0, first) + d.slice(firstEnd)
writeFileSync('src/lib/db.mjs', d)
const dupes = (d.match(/export function createMerchantApplication/g) || []).length
console.log('db.mjs createMerchantApplication exports now:', dupes, '(MUST be 1)')

// ---- FIX 2: schema.sql — keep second CREATE block, drop first.
let s = readFileSync('data/db/schema.sql', 'utf8')
const m2 = 'CREATE TABLE IF NOT EXISTS merchant_applications ('
let a = s.indexOf(m2)
let b = s.indexOf(m2, a + 1)
if (a === -1 || b === -1) throw new Error('schema seam vanished ' + a + ', ' + b)
let aEnd = blockEnd(s, a)
s = s.slice(0, a) + s.slice(aEnd)
writeFileSync('data/db/schema.sql', s)
const sDupes = (s.match(/CREATE TABLE IF NOT EXISTS merchant_applications/g) || []).length
console.log('schema merchant_applications CREATEs now:', sDupes, '(MUST be 1)')
