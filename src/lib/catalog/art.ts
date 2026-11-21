const toDataUri = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const palettes = [
  { bg1: '#7c3aed', bg2: '#2563eb', accent: '#a78bfa' },
  { bg1: '#dc2626', bg2: '#f97316', accent: '#fbbf24' },
  { bg1: '#059669', bg2: '#0891b2', accent: '#34d399' },
  { bg1: '#7c3aed', bg2: '#db2777', accent: '#f472b6' },
  { bg1: '#0f172a', bg2: '#1e40af', accent: '#60a5fa' },
  { bg1: '#1e1b4b', bg2: '#4338ca', accent: '#818cf8' },
  { bg1: '#064e3b', bg2: '#047857', accent: '#34d399' },
  { bg1: '#1c1917', bg2: '#7c2d12', accent: '#fb923c' },
];

const createMovieArt = (title: string, subtitle = 'Movie') => {
  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  const safeSubtitle = subtitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const hash = title.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const palette = palettes[hash % palettes.length];
  const x1 = 150 + ((hash * 7) % 500),
    y1 = 100 + ((hash * 13) % 300),
    r1 = 80 + ((hash * 3) % 100);
  const x2 = 100 + ((hash * 11) % 600),
    y2 = 700 + ((hash * 5) % 400),
    r2 = 100 + ((hash * 7) % 150);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" role="img" aria-label="${safeTitle}">
      <defs><linearGradient id="bg${hash}" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${palette.bg1}"/><stop offset="55%" stop-color="${palette.bg2}"/><stop offset="100%" stop-color="#0f172a"/>
      </linearGradient></defs>
      <rect width="800" height="1200" fill="url(#bg${hash})"/>
      <rect x="48" y="48" width="704" height="1104" rx="28" fill="rgba(15,23,42,0.42)" stroke="rgba(148,163,184,0.7)"/>
      <circle cx="${x1}" cy="${y1}" r="${r1}" fill="${palette.accent}" opacity="0.15"/>
      <circle cx="${x2}" cy="${y2}" r="${r2}" fill="${palette.bg1}" opacity="0.12"/>
      <text x="400" y="490" text-anchor="middle" font-size="76" font-weight="700" fill="#f8fafc" font-family="Arial, Helvetica, sans-serif">${safeTitle}</text>
      <text x="400" y="600" text-anchor="middle" font-size="30" letter-spacing="6" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif">${safeSubtitle}</text>
      <rect x="190" y="665" width="420" height="4" fill="${palette.accent}" opacity="0.9"/>
      <text x="400" y="760" text-anchor="middle" font-size="26" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif">VXNTA</text>
    </svg>`;
  return toDataUri(svg);
};

export const makePosterUrl = (title: string) => createMovieArt(title, 'MOVIE');
export const makeBannerUrl = (title: string) => createMovieArt(title, 'NOW PLAYING');
