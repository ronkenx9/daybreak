import type { Metadata, Viewport } from 'next';
import './globals.css';
import './daybreak.css';
import Motion from '@/components/daybreak/Motion';
import Web3Provider from '@/components/daybreak/Web3Provider';
import AccountProvider from '@/components/daybreak/AccountProvider';

export const metadata: Metadata = {
  title: 'Daybreak — A new day. A little more yours.',
  description:
    'Discover the companies behind your everyday, explore stock circles, and make Daybreak your own.',
  icons: {
    icon: '/assets/daybreak-icon.svg',
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
        <AccountProvider>
          <Web3Provider>{children}</Web3Provider>
        </AccountProvider>
        <Motion />
      </body>
    </html>
  );
}
