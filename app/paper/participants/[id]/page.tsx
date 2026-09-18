import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPaperPortfolio } from '@/lib/db/repo-theses';
import { pageNumber } from '@/lib/theses/discovery';
import { THESIS_INSTRUMENTS } from '@/lib/theses/instruments';
export const dynamic = 'force-dynamic';
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });
export default async function PaperParticipant({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{64}$/.test(id)) notFound();
  let page = 0;
  try { page = pageNumber((await searchParams).page ?? null); } catch { notFound(); }
  const portfolio = await getPaperPortfolio(id, page);
  if (!portfolio) notFound();
  const symbol = (instrumentId: string) => THESIS_INSTRUMENTS.find(i => i.id === instrumentId)?.symbol ?? instrumentId;
  return <main className="db-public-thesis"><Link className="db-text-link" href="/app/conviction">← Conviction</Link><header><div><span className="db-paper-badge">Public paper portfolio</span><h1>{portfolio.displayName || 'Daybreak member'}</h1><small>Participant {id.slice(0, 8)}</small></div></header><p>Simulated positions and balances. Mark-to-market uses the latest marginal price. Estimated exit includes the current curve impact and fee.</p><section className="db-paper-summary">{portfolio.balances.map(b => <div key={b.instrumentId}><span>Available paper balance</span><strong>{fmt(b.balance)} {symbol(b.instrumentId)}</strong></div>)}</section><section className="db-paper-ledger"><h2>Public positions</h2>{portfolio.positions.map(p => <article key={p.thesisId}><Link href={`/app/conviction?thesis=${p.slug}&simulate=1`}>{p.title}</Link><span>{fmt(p.quantity)} {p.tokenSymbol}</span><span>Mark-to-market P/L: {fmt(p.totalPnlQuote)} {symbol(p.instrumentId)}</span><span>Estimated exit P/L: {fmt(p.estimatedExitPnl)} {symbol(p.instrumentId)}</span></article>)}</section><nav>{page > 0 && <Link className="db-button" href={`?page=${page - 1}`}>Previous</Link>}{portfolio.hasMore && <Link className="db-button" href={`?page=${page + 1}`}>Next positions</Link>}</nav></main>;
}
