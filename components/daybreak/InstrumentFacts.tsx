'use client';
import { useQuery } from '@tanstack/react-query';

interface Facts {
  ticker: string; xSymbol: string; name: string; isin: string;
  underlyingIsin: string | null; underlyingCountry: string | null; currency: string | null;
  tradingHoursMode: string | null; tradingHalted: boolean; atomicHalted: boolean;
  reserve: { sharesHeld: number | null; circulatingSupply: number | null; provider: string | null; asOf: string | null } | null;
}

// Instrument facts / compliance panel for the stock workspace. Dynamic facts come
// from the xStocks API + the verified Solana mint; the rights/controls/redemption
// lines are the honesty-critical facts the plan requires (no voting rights; the
// Token-2022 issuer controls verified in S1). This is product info, not legal advice.
export default function InstrumentFacts({ ticker }: { ticker: string }) {
  const q = useQuery({
    queryKey: ['xstocks-facts', ticker],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/xstocks/facts?ticker=${ticker}`, { signal });
      if (!r.ok) return null;
      return r.json() as Promise<Facts>;
    },
    staleTime: 5 * 60_000, retry: 1,
  });
  const d = q.data;
  if (!d) return null;
  const fact = (k: string, v: string) => <div className="db-facts-row"><span>{k}</span><b>{v}</b></div>;

  return (
    <section className="db-facts">
      <div className="db-section-heading"><h3>Instrument facts</h3><span className="db-small-note">xStocks · Solana</span></div>
      <div className="db-facts-list">
        {fact('Product', `Tokenized tracker certificate (${d.xSymbol}), issued by Backed Finance`)}
        {fact('Underlying', `${d.ticker}${d.underlyingIsin ? ` · ISIN ${d.underlyingIsin}` : ''}${d.underlyingCountry ? ` · ${d.underlyingCountry}` : ''}`)}
        {fact('Product ISIN', d.isin)}
        {fact('Backing', '≈1:1 by shares held with a regulated custodian (Backed proof-of-reserves)')}
        {fact('Trading hours', d.tradingHoursMode === 'TwentyFourFive' ? '24/5' : (d.tradingHoursMode || '—'))}
        {fact('Status', d.tradingHalted ? 'Trading halted' : 'Active')}
        {fact('Shareholder rights', 'None — a tracker certificate confers no voting or direct shareholder rights')}
        {fact('Issuer controls', 'Token-2022: pausable, permanent delegate and transfer hook — the issuer can freeze or move tokens')}
        {fact('Redemption', 'Restricted to eligible parties via Backed; not guaranteed permissionless liquidity')}
      </div>
      <p className="db-small-note">Facts from the xStocks public API and the verified Solana mint. Product information, not legal or investment advice, and not a jurisdiction-eligibility determination. <a className="db-text-link" href="https://docs.xstocks.fi/docs/product-legal-overview" target="_blank" rel="noreferrer">Legal overview ↗</a></p>
    </section>
  );
}
