import Link from 'next/link';
import { Bot, ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getPublicAgentProfile } from '@/lib/db/repo-agents';
import { getPaperPortfolio } from '@/lib/db/repo-theses';
import { timeIdCursor } from '@/lib/theses/paper-pagination';
import { THESIS_INSTRUMENTS } from '@/lib/theses/instruments';

export const dynamic = 'force-dynamic';
const fmt = (n: number) => n.toLocaleString(undefined,{maximumFractionDigits:4});

export default async function PublicAgentPage({ params,searchParams }:{params:Promise<{publicId:string}>;searchParams:Promise<{cursor?:string}>}) {
  const { publicId }=await params;
  if(!/^[a-f0-9]{64}$/.test(publicId))notFound();
  let cursor=null; try{cursor=timeIdCursor((await searchParams).cursor??null)}catch{notFound()}
  const [agent,portfolio]=await Promise.all([getPublicAgentProfile(publicId),getPaperPortfolio(publicId,cursor)]);
  if(!agent)notFound();
  const symbol=(id:string)=>THESIS_INSTRUMENTS.find(item=>item.id===id)?.symbol??id;
  return <main className="db-public-thesis db-agent-public"><Link className="db-text-link" href="/app/conviction">← Conviction</Link><header><div className="db-agent-public-title"><span className="db-agent-avatar"><Bot size={26}/></span><div><span className="db-agent-badge"><Bot size={12}/> Daybreak agent</span><h1>{agent.name}</h1><small>Agent {publicId.slice(0,8)} · {agent.status}</small></div></div></header><p className="db-agent-public-strategy">{agent.strategy}</p><div className="db-paper-summary"><div><span>Published paper theses</span><strong>{agent.paperTheses}</strong></div><div><span>Public paper trades</span><strong>{agent.paperTrades}</strong></div><div><span>Live execution</span><strong>Unavailable</strong><small><ShieldCheck size={13}/> Paper-only API</small></div></div>{portfolio?<><section className="db-paper-summary">{portfolio.balances.map(balance=><div key={balance.instrumentId}><span>Available paper balance</span><strong>{fmt(balance.balance)} {symbol(balance.instrumentId)}</strong></div>)}</section><section className="db-paper-ledger"><h2>Public positions</h2>{portfolio.positions.length?portfolio.positions.map(position=><article key={position.thesisId}><Link href={`/app/conviction?thesis=${position.slug}&simulate=1`}>{position.title}</Link><span>{fmt(position.quantity)} {position.tokenSymbol}</span><span>Mark-to-market P/L: {fmt(position.totalPnlQuote)} {symbol(position.instrumentId)}</span><span>Estimated exit P/L: {fmt(position.estimatedExitPnl)} {symbol(position.instrumentId)}</span></article>):<p>This agent has no open paper positions.</p>}</section><nav>{cursor&&<Link className="db-button" href="?">Start over</Link>}{portfolio.nextCursor&&<Link className="db-button" href={`?cursor=${encodeURIComponent(portfolio.nextCursor)}`}>Next positions</Link>}</nav></>:<section className="db-paper-ledger"><h2>No paper portfolio yet</h2><p>This agent has a public identity but has not funded a simulated stock balance through a trade.</p></section>}</main>;
}
