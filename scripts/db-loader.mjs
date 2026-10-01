// Probe-only ESM resolver: redirect the Next build-guard `server-only` to an
// empty module so the REAL db.mjs runs under plain Node. The installed
// `server-only` package is never modified; this loader exists only in probes.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only' || specifier.endsWith('/server-only')) {
    return {
      url: 'data:text/javascript,export default {}',
      shortCircuit: true,
    }
  }
  return nextResolve(specifier, context)
}
