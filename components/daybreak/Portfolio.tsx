'use client';
import {StockIcon} from './Identity';
import {portfolio,positionUsdAtoms,usd,type HoldingsSnapshot} from '@/lib/base/model';
export default function Portfolio({snapshot,error,loading,refresh,refreshing}:{snapshot?:HoldingsSnapshot;error:boolean;loading:boolean;refresh:()=>void;refreshing:boolean}){
 const totals=snapshot?portfolio(snapshot.holdings,snapshot.prices):null;
 const complete=snapshot?.status==='complete'&&totals?.missing===0;
 const tooOld=!!snapshot&&Date.now()-snapshot.observedAt>90000;
 return <section aria-label="Wallet holdings" className="db-portfolio"><div className="db-section-heading"><h2>Your stocks</h2><button className="db-text-link" disabled={refreshing} onClick={refresh}>{refreshing?'Refreshing…':'Refresh balances'}</button></div>
 {error&&<p role="alert" className="db-data-notice">We couldn’t refresh this wallet. {snapshot?'Showing its previous snapshot; it may have changed.':'Your holdings are unavailable, not zero.'}</p>}
 {loading&&!snapshot&&<p role="status">Reading balances on Base…</p>}
 {snapshot&&<><div className="db-portfolio-value"><span>{complete?'Reference value':'Priced subtotal'}{error||tooOld?' · previous snapshot':''}</span><h2>{totals&&((snapshot.holdings.length===0&&complete)||totals.priced>0)?usd(totals.total):'Unavailable'}</h2><p>{totals?.missing?`${totals.missing} position(s) have no usable price. `:''}{snapshot.failedTokens.length?`${snapshot.failedTokens.length} token(s) could not be checked. `:''}{totals?.aged?'Includes aged oracle references. ':''}Chainlink reference values are not executable sale prices.</p></div>
 {snapshot.status==='partial'&&<p role="status" className="db-data-notice">Incomplete coverage: {snapshot.failedTokens.join(', ')}. Retry to check these tokens.</p>}
 {snapshot.holdings.length>0?<div className="db-holdings-list">{snapshot.holdings.map(h=>{const p=snapshot.prices[h.ticker],v=positionUsdAtoms(h,p);return <div className="db-holding-row" key={h.token}><StockIcon ticker={h.ticker} size={44}/><div className="db-holding-main"><strong>{h.name}</strong><small>{h.shares} underlying shares</small><small>{h.tokenQuantity} {h.onchainSymbol} tokens</small></div><div className="db-holding-val"><strong>{v===null?'Unavailable':usd(v)}</strong><small>{p?.state==='paused'?'Oracle paused':p?.updatedAt?`Oracle as of ${new Date(p.updatedAt).toLocaleString()}`:'No price'}</small></div></div>})}</div>:snapshot.status==='complete'?<p>No supported tokenized stocks found at this block.</p>:<p>No positive balances found among the tokens successfully checked.</p>}
 <p className="db-small-note">Base block {snapshot.blockNumber} · checked {new Date(snapshot.observedAt).toLocaleString()}. Covers the supported Coinbase token list in this wallet; excludes brokerage accounts, other chains and tokens deposited into lending or liquidity positions.</p></>}
 </section>;
}
