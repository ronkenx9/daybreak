import type { Metadata, Viewport } from 'next';
import './globals.css';
import './daybreak.css';
import Motion from '@/components/daybreak/Motion';
import Web3Provider from '@/components/daybreak/Web3Provider';
import AccountProvider from '@/components/daybreak/AccountProvider';
import { Analytics } from '@vercel/analytics/next';
import { LocaleProvider } from '@/components/daybreak/LocaleProvider';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.daybreakcircles.lol'),
  title: {
    default: 'Daybreak — Tokenized stocks find their people',
    template: '%s — Daybreak',
  },
  description:
    'Discover companies, compare exact stock instruments on Base and Solana, review quotes, and join private wallet-verified holder circles.',
  applicationName: 'Daybreak',
  authors: [{ name: 'Daybreak', url: 'https://www.daybreakcircles.lol' }],
  creator: 'Daybreak',
  publisher: 'Daybreak',
  keywords: ['tokenized stocks', 'stocks on Base', 'xStocks on Solana', 'stock instrument comparison', 'holder circles', 'onchain communities'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Daybreak',
    title: 'Daybreak — Tokenized stocks find their people',
    description: 'Compare exact stock instruments on Base and Solana, follow company context, and join private wallet-verified holder circles.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Daybreak — tokenized stocks find their people' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Daybreak — Tokenized stocks find their people',
    description: 'Exact stock instruments on Base and Solana, company context, reviewed quotes, and private holder circles.',
    creator: '@kenn_ronin',
    images: ['/opengraph-image'],
  },
  category: 'finance',
  manifest: '/manifest.webmanifest',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  icons: {
    icon: '/assets/daybreak-icon-v2.svg',
  },
  // Base app-domain ownership verification (Base Build "Add Domain" step).
  other: {
    'base:app_id': '6a9eb0205538a47d1b071bdf',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
    viewportFit: 'cover',
  themeColor: '#0210ef',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Daybreak',
              url: 'https://www.daybreakcircles.lol',
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Web',
              description: 'Company-first stock discovery, exact instrument comparison on Base and Solana, reviewed quotes, and wallet-verified holder circles.',
              offers: [
                { '@type': 'Offer', price: '0', priceCurrency: 'USD', category: 'Consumer app' },
                { '@type': 'Offer', price: '0.005', priceCurrency: 'USDC', category: 'x402 pairing-intelligence API call' },
              ],
            }).replace(/</g, '\\u003c'),
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Doto:wght@500;700;900&family=Space+Grotesk:wght@500;600;700&family=Inter+Tight:wght@400;500;600&display=swap" />
        {/*
          Arms the reveal system before first paint, so elements start hidden
          instead of flashing in and then snapping back. The failsafe drops the
          class if Motion.tsx never hydrates, which un-hides everything.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
if(r.getAttribute('data-reduce-motion')==='true')return;
r.classList.add('db-motion');
setTimeout(function(){if(r.dataset.dbMotionReady!=='1')r.classList.remove('db-motion')},2500);
}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-porcelain text-ink selection:bg-day-blue/20 selection:text-ink">
        <LocaleProvider>
          <AccountProvider>
            <Web3Provider>{children}</Web3Provider>
          </AccountProvider>
        </LocaleProvider>
        <Analytics />
        <Motion />
      </body>
    </html>
  );
}
