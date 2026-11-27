export type SelectedCaption = { url: string | null; label: string; enabled: boolean };
export function playerCaptionUrl(
  origin: string,
  slug?: string,
  selection?: SelectedCaption,
): string | null {
  if (selection?.enabled === false || !origin) return null;
  if (selection?.url) {
    try {
      const url = new URL(selection.url, origin);
      if (
        url.origin !== origin ||
        url.search ||
        url.hash ||
        url.username ||
        url.password ||
        !/^\/api\/subtitles\/(?:(?:source|translated)\/[a-f0-9-]{36}|mongolian\/[a-zA-Z0-9-]+)$/.test(
          url.pathname,
        )
      )
        return null;
      return url.href;
    } catch {
      return null;
    }
  }
  return slug ? `${origin}/api/subtitles/mongolian/${encodeURIComponent(slug)}` : null;
}
export function captionLanguage(label: string) {
  return (
    (
      {
        Mongolian: 'mn',
        English: 'en',
        Korean: 'ko',
        Japanese: 'ja',
        Chinese: 'zh',
        Russian: 'ru',
        Spanish: 'es',
        French: 'fr',
        German: 'de',
        Arabic: 'ar',
        Hindi: 'hi',
        Turkish: 'tr',
      } as Record<string, string>
    )[label] ?? ''
  );
}
