'use client';
import {useQuery} from '@tanstack/react-query';
interface Feed{ticker:string;articles:{title:string;url:string;source:string;seenAt:string}[];checkedAt:number}
export default function CompanyNews({ticker}:{ticker:string}){
 const q=useQuery({queryKey:['news',ticker],queryFn:async({signal})=>{const r=await fetch(`/api/news?ticker=${encodeURIComponent(ticker)}`,{signal});const d=await r.json();if(!r.ok)throw Error(d.error);return d as Feed},staleTime:15*60000,retry:false});
 return <section className="db-news" aria-label={`${ticker} company news`}><div className="db-section-heading"><h3>Company news</h3><button className="db-text-link" disabled={q.isFetching} onClick={()=>void q.refetch()}>{q.isFetching?'Loading…':'Refresh'}</button></div>
 {q.isPending&&<p role="status">Finding recent coverage…</p>}{q.isError&&<p role="status">News is temporarily unavailable.{q.data?' Previously loaded articles are below.':''}</p>}
 {q.data?.articles.length===0&&<p>No matching coverage found in the past week.</p>}
 {q.data?.articles.map(a=><article key={a.url}><a href={a.url} target="_blank" rel="noopener noreferrer">{a.title} ↗</a><small>{a.source}{a.seenAt?` · indexed ${new Date(a.seenAt).toLocaleDateString()}`:''}</small></article>)}
 <p className="db-small-note">Article discovery by <a href="https://www.gdeltproject.org/" target="_blank" rel="noreferrer">GDELT</a>. Company-name matches may include related coverage. Read the original publisher for the full story.</p></section>;
}
