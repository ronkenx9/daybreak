'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, Lock, WalletCards } from 'lucide-react';
import { useAccountState } from './AccountProvider';
import type { TradeInstrument } from '@/lib/trading/model';
import { xlayerStockFor } from '@/lib/xlayer/tokens';

interface Holding { symbol: string; tokenBalance: string; shares: string }
interface HoldingsSnap { items: Holding[]; gasBalanceOkb?: string | null }

const fmt = (value: string, max = 4) => Number(value).toLocaleString('en-US', { maximumFractionDigits: max });

/** X Layer view of one xStock in Compare instruments: the verified contract and your balance.
 * Backing ideas with real stock lives on each thesis ("What do people believe?"). */
export default function XLayerStockPanel({ instrument }: { instrument: TradeInstrument }) {
  const account = useAccountState();
  const wallet = account.user?.wallet ?? null;
  const stock = xlayerStockFor(instrument.symbol)!;

  const holdings = useQuery({
    queryKey: ['xlayer-holdings', wallet], enabled: !!wallet, staleTime: 15_000, retry: 1,
    queryFn: async ({ signal }) => { const r = await fetch(`/api/xlayer/holdings?address=${wallet}`, { signal, cache: 'no-store' }); if (!r.ok) throw new Error('unavailable'); return r.json() as Promise<HoldingsSnap>; },
  });
  const held = holdings.data?.items.find((h) => h.symbol === stock.symbol) ?? null;
  const gas = holdings.data?.gasBalanceOkb;
  const noGas = gas != null && Number(gas) === 0;

  return <div className="db-quote-builder db-xlayer-panel">
    <div className="db-quote-selection"><div><span>On X Layer</span><strong>{stock.symbol} · {stock.name}</strong><small>Backed Finance · verified contract</small></div><a href={instrument.explorerUrl} target="_blank" rel="noreferrer">View contract <ArrowUpRight size={13}/></a></div>

    {!wallet ? <p className="db-quote-wallet-note"><WalletCards size={15}/> Sign in to see your {stock.symbol} on X Layer.</p>
      : holdings.isPending ? <p className="db-small-note">Reading your X Layer balance…</p>
      : holdings.isError ? <p className="db-small-note">X Layer balances are unavailable right now. They have not been reported as zero.</p>
      : <p className="db-small-note"><b>You hold</b> {held ? `${fmt(held.shares)} ${stock.ticker} shares (${fmt(held.tokenBalance)} ${stock.symbol})` : `no ${stock.symbol} on X Layer yet`}{noGas ? ' · You need a little OKB on X Layer for network fees.' : ''}</p>}

    <p className="db-quote-wallet-note"><Lock size={13}/> Believe in a {stock.ticker} thesis? Back it with real {stock.symbol}: it’s locked on X Layer and unlocks in full when the thesis ends.</p>
    <Link className="db-text-link" href={`/app/conviction?stock=${encodeURIComponent(stock.ticker)}`}>See {stock.ticker} theses <ArrowRight size={14}/></Link>
  </div>;
}
