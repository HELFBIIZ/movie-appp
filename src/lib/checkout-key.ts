export function checkoutKey(
  name: string,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
  now = Date.now(),
): string {
  let key: string = crypto.randomUUID();
  let createdAt = now;
  try {
    const target = storage ?? window.sessionStorage;
    const saved: unknown = JSON.parse(target.getItem(name) || 'null');
    if (
      saved &&
      typeof saved === 'object' &&
      'key' in saved &&
      typeof saved.key === 'string' &&
      /^[a-f0-9-]{36}$/.test(saved.key) &&
      'at' in saved &&
      typeof saved.at === 'number' &&
      now - saved.at >= 0 &&
      now - saved.at < 3_600_000
    ) {
      key = saved.key;
      createdAt = saved.at;
    }
    target.setItem(name, JSON.stringify({ key, at: createdAt }));
  } catch {
    /* Keep the page's in-memory key when browser storage is blocked. */
  }
  return key;
}
