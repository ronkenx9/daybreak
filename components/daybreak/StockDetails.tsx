'use client';
import {type StockToken,STOCK_SOURCE_URL,ISSUER_URL,REGISTRY_CHECKED_AT} from '@/lib/base/tokens';
import {type StockPrice,priceState} from '@/lib/base/model';
import CorporateEvents from './CorporateEvents';
import InstrumentFacts from './InstrumentFacts';
import InstrumentComparison from './InstrumentComparison';
export default function StockDetails({token,price}:{token:StockToken;price?:StockPrice}){
 const p=price?priceState(price):undefined;
 return <section className="db-stock-details"><div className="db-token-price-big"><strong>{p?.priceUsd!=null&&p.state!=='paused'?p.priceUsd.toLocaleString('en-US',{style:'currency',currency:'USD'}):'Price unavailable'}</strong><small>{p?.state==='paused'?'Oracle paused':p?.state==='aged'?'Aged oracle reference':'Oracle reference · not a trade quote'}{p?.updatedAt?` · ${new Date(p.updatedAt).toLocaleString()}`:''}</small></div><p>Company-level market reference. Choose the exact instrument and network before requesting a tradable route.</p><p className="db-small-note">Registry checked {REGISTRY_CHECKED_AT}. Token quantity and underlying share quantity can differ across issuers and after corporate actions.</p><CorporateEvents ticker={token.ticker}/><div className="db-stock-links"><a href={STOCK_SOURCE_URL} target="_blank" rel="noreferrer">Base listings ↗</a><a href={ISSUER_URL} target="_blank" rel="noreferrer">Coinbase issuer terms ↗</a></div><InstrumentComparison key={token.ticker} token={token}/><InstrumentFacts ticker={token.ticker}/></section>;
}
