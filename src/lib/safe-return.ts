export function safeReturnTo(input: unknown, fallback = '/learning'): string {
  if (
    typeof input !== 'string' ||
    input.length > 1500 ||
    !input.startsWith('/') ||
    input.startsWith('//') ||
    /[\\\u0000-\u001f]/.test(input)
  )
    return fallback;
  try {
    const url = new URL(input, 'https://vxnta.invalid');
    if (
      url.origin !== 'https://vxnta.invalid' ||
      !/^\/(?:learn|learning|pricing|watch\/[a-z0-9-]+|movie\/[a-z0-9-]+)$/.test(url.pathname)
    )
      return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}
