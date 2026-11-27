export function hostedCheckoutUrl(input) {
  try {
    const url = new URL(input);
    return url.origin === 'https://pay.wire.mn' &&
      /^\/c\/cs_[a-zA-Z0-9_-]+$/.test(url.pathname) &&
      !url.username &&
      !url.password &&
      !url.hash
      ? url.href
      : null;
  } catch {
    return null;
  }
}
