'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from './Identity';
import MotionBackground from './MotionBackground';
import StatsBoard from './StatsBoard';

export default function StatsDashboard() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const m = matchMedia('(prefers-color-scheme: dark)');
    const on = () => setDark(m.matches); on();
    m.addEventListener('change', on); return () => m.removeEventListener('change', on);
  }, []);

  return (
    <div className="db-app" data-theme={dark ? 'dark' : undefined}>
      <MotionBackground dark={dark} reduced={false} />
      <header className="db-app-header">
        <Wordmark />
        <Link href="/app" className="db-text-link"><ArrowLeft size={16} /> Back to app</Link>
      </header>
      <main className="db-app-content">
        <div className="db-app-title"><div>
          <span className="db-eyebrow">Live · Daybreak on Base</span>
          <h1>Daybreak by the numbers.</h1>
        </div></div>
        <StatsBoard />
      </main>
    </div>
  );
}
