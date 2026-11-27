// Parse only the public Frontend API hostname; no secret value is serialized.
export function clerkCspSources(publishableKey, configured) {
  if (!configured || !/^pk_(?:test|live)_[A-Za-z0-9+/=_-]+$/.test(publishableKey || '')) return '';
  try {
    const host = Buffer.from(publishableKey.replace(/^pk_(?:test|live)_/, ''), 'base64')
      .toString('utf8')
      .replace(/\$$/, '');
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(host)) return '';
    return ` https://${host} https://challenges.cloudflare.com https://*.protect.clerk.com`;
  } catch {
    return '';
  }
}
