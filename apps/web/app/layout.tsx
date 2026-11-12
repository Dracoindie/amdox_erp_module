import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { MSWProvider } from '../components/MSWProvider';
import { Providers } from '../components/Providers';
import { THEME_SCRIPT } from '../lib/theme';

const geistSans = localFont({ src: './fonts/GeistVF.woff', variable: '--font-geist-sans', display: 'swap' });
const geistMono = localFont({ src: './fonts/GeistMonoVF.woff', variable: '--font-geist-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Amdox ERP', template: '%s · Amdox ERP' },
  description: 'Amdox ERP Suite — finance, HR, supply chain, CRM and analytics',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6f8' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f17' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The theme script sets class="dark" before hydration, hence suppressHydrationWarning.
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-canvas font-sans text-fg antialiased">
        <MSWProvider>
          <Providers>{children}</Providers>
        </MSWProvider>
      </body>
    </html>
  );
}
