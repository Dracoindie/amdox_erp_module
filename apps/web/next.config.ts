import type { NextConfig } from 'next';

// Content-Security-Policy is built from the environment at build time:
//   NEXT_PUBLIC_API_URL   origin of the API (added to connect-src)
//   CSP_CONNECT_SRC       extra space-separated origins for connect-src (optional)
// With neither set, the app may only talk to its own origin (MSW demo builds).

function origin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const isVercel = !!process.env.VERCEL;
const isDev = process.env.NODE_ENV !== 'production';

const connectSrc = [
  "'self'",
  origin(process.env.NEXT_PUBLIC_API_URL),
  ...(process.env.CSP_CONNECT_SRC ?? '').split(/\s+/).filter(Boolean),
  ...(isDev ? ['ws:'] : []), // Next.js dev HMR
  ...(isVercel ? ['https://vercel.live', 'wss://ws-us3.pusher.com'] : []),
].filter((v): v is string => !!v);

const csp = [
  "default-src 'self'",
  // Next.js needs inline scripts for hydration; 'unsafe-eval' only in dev (React Refresh)
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}${isVercel ? ' https://vercel.live' : ''}`,
  `connect-src ${[...new Set(connectSrc)].join(' ')}`,
  `frame-src 'self'${isVercel ? ' https://vercel.live' : ''}`,
  "frame-ancestors 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "worker-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
