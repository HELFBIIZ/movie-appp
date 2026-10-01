// probe-time-only resolver: shim the Next build-guard `server-only` to a real
// no-op module so the db.mjs slice can be exercised under plain Node. The real
// package and db.mjs's security posture are untouched — this hook exists solely
// inside the probe process.
const EMPTY = `export const __probeShim = true`
export function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only' || specifier === 'server-only/package.json') {
    return { url: 'data:text/javascript;base64,' + Buffer.from(EMPTY).toString('base64'), shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
