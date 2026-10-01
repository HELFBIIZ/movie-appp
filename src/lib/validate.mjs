// src/lib/validate.mjs — tiny, dependency-free body/query validator for route
// handlers. Mirrors what express-validator would give an Express app without
// pulling a framework. Every helper returns { ok, value } or { error, field }.
import { NextResponse } from 'next/server'

export async function parseJsonBody(request, fallback = {}) {
  try { return await request.json() } catch { return fallback }
}

export function str(v) {
  return { ok: typeof v === 'string', value: v }
}

export function optStr(v, { max = 2000 } = {}) {
  if (v === undefined || v === null || v === '') return { ok: true, value: null }
  return { ok: typeof v === 'string' && v.length <= max, value: v }
}

export function reqStr(v, { min = 1, max = 200, pattern = null } = {}) {
  if (typeof v !== 'string' || v.length < min || v.length > max) return { ok: false, value: v }
  if (pattern && !pattern.test(v)) return { ok: false, value: v }
  return { ok: true, value: v }
}

export function intBetween(v, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(v)
  return { ok: Number.isInteger(n) && n >= min && n <= max, value: n }
}

export function oneOf(v, allowed) {
  return { ok: allowed.includes(v), value: v }
}

/** First failing check wins; returns { error } when anything is invalid. */
export function all(...checks) {
  for (const c of checks) {
    if (!c.ok) return { error: { field: c.field ?? null, value: c.value ?? null, code: 'INVALID_INPUT' } }
  }
  return { ok: true }
}

export function badInput(message, field = null) {
  return NextResponse.json({ error: { code: 'INVALID_INPUT', message, field } }, { status: 400 })
}