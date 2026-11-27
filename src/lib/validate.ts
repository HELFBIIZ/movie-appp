import { NextResponse } from 'next/server';

export type ValidationCheck<T = unknown> = (
  { ok: true; value: T } | { ok: false; value: unknown }
) & { field?: string | null };

export async function parseJsonBody(
  request: Pick<Request, 'json'>,
  fallback: unknown = {},
): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return fallback;
  }
}

export function str(value: unknown): ValidationCheck<string> {
  return typeof value === 'string' ? { ok: true, value } : { ok: false, value };
}

export function optStr(value: unknown, { max = 2000 } = {}): ValidationCheck<string | null> {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  return typeof value === 'string' && value.length <= max
    ? { ok: true, value }
    : { ok: false, value };
}

export function reqStr(
  value: unknown,
  {
    min = 1,
    max = 200,
    pattern = null,
  }: { min?: number; max?: number; pattern?: RegExp | null } = {},
): ValidationCheck<string> {
  if (typeof value !== 'string' || value.length < min || value.length > max)
    return { ok: false, value };
  if (pattern && !pattern.test(value)) return { ok: false, value };
  return { ok: true, value };
}

export function intBetween(
  value: unknown,
  { min = 0, max = Number.MAX_SAFE_INTEGER } = {},
): ValidationCheck<number> {
  const number = Number(value);
  return { ok: Number.isInteger(number) && number >= min && number <= max, value: number };
}

export function oneOf(value: unknown, allowed: readonly unknown[]): ValidationCheck {
  return { ok: allowed.includes(value), value };
}

/** Keep the first failure, its original value, and the existing response shape. */
export function all(...checks: ValidationCheck[]) {
  for (const check of checks) {
    if (!check.ok)
      return {
        error: { field: check.field ?? null, value: check.value ?? null, code: 'INVALID_INPUT' },
      };
  }
  return { ok: true };
}

export function badInput(message: string, field: string | null = null) {
  return NextResponse.json({ error: { code: 'INVALID_INPUT', message, field } }, { status: 400 });
}
