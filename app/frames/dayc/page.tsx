import type { Metadata } from 'next';
import Link from 'next/link';
import { DAYBREAK_TOKEN } from '@/lib/base/daybreak-token';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.daybreakcircles.lol').replace(/\/$/, '');
const IMAGE = `${SITE}/frames/dayc/image`;
const APP = `${SITE}/app`;

// Farcaster Frame (vNext): a shareable $DAYC card that renders in-feed on Warpcast
// with an "Open Daybreak" and a "Buy $DAYC" link button.
export const metadata: Metadata = {
  title: '$DAYC on Daybreak',
  description: 'Live $DAYC price on Base. Discover tokenized stocks, make memes, launch tokens.',
  openGraph: { title: '$DAYC on Daybreak', images: [IMAGE] },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': IMAGE,
    'fc:frame:image:aspect_ratio': '1.91:1',
    'fc:frame:button:1': 'Open Daybreak',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': APP,
    'fc:frame:button:2': 'Buy $DAYC',
    'fc:frame:button:2:action': 'link',
    'fc:frame:button:2:target': DAYBREAK_TOKEN.buyUrl,
  },
};

export default function DaycFramePage() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#0a0f1c', color: '#eaeefb', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={IMAGE} alt="$DAYC on Daybreak" style={{ width: '100%', borderRadius: 20, border: '1px solid #242e49' }} />
        <p style={{ color: '#8b96ae', marginTop: 20, lineHeight: 1.6 }}>
          Cast this page on Farcaster to share a live $DAYC card. Or{' '}
          <Link href="/app" style={{ color: '#4f74ff' }}>open Daybreak</Link>.
        </p>
      </div>
    </main>
  );
}
