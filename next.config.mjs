/** @type {import('next').NextConfig} */

// Helmet-equivalent for Next: a static, dependency-free security-header layer
// applied to every route at the network edge (headers()). Next serves HTTP /
// HTTPS, so runtime middleware (proxy.ts) is unnecessary for these headers.
//   • CSP keeps player iframes allowed (vidsrc.buzz / vidcore.org / YouTube)
//     while blocking everything else from embedding or executing off-origin.
//   • HSTS is emitted in all environments; harmless on localhost, essential on
//     the production domain (add preload when you control HSTS preload lists).
const isDev = process.env.NODE_ENV === 'development'
// React dev + our dynamic import('hls.js') need eval to rebuild callstacks —
// NEVER ship 'unsafe-eval' to production. worker-src blob: is required by
// hls.js's optional WebWorker (MediaSource buffering) in both envs.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'"

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), autoplay=(self)',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=15552000; includeSubDomains',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "connect-src 'self' https: blob:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https: blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      // Next RSC/dev requires inline scripts; player + trailer frames stay allowlisted.
      scriptSrc,
      "worker-src 'self' blob:",
      "frame-src https://vidsrc.buzz https://vidcore.org https://www.youtube.com https://www.youtube-nocookie.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.co.uk',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
  },
  // Runtime fs reads that Next's tracer can't see statically must ship to Vercel.
  outputFileTracingIncludes: {
    '/api/subtitles/**': ['./data/subtitles/**/*.vtt'],
    '/api/subtitles/*': ['./data/subtitles/**/*.vtt'],
    '/**': ['./data/db/schema.sql', './data/db/seeds.sql'],
  },
};

export default nextConfig;