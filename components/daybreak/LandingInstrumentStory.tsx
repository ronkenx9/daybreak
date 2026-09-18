import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, CircleCheck, LockKeyhole, Newspaper } from 'lucide-react';
import { StockIcon } from './Identity';

const STEPS = [
  { number: '01', title: 'Discover the company', body: 'Read the story, chart and discussion in one workspace.' },
  { number: '02', title: 'Compare exact assets', body: 'See issuer, network, contract or mint, and the wallet each route needs.' },
  { number: '03', title: 'Review the quote', body: 'Check expected output, minimum received, impact, costs and freshness.' },
  { number: '04', title: 'Verify and join', body: 'Prove an eligible holding privately, then enter the company Circle.' },
];

const short = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`;

export default function LandingInstrumentStory() {
  return <section id="instruments" className="db-section db-instrument-story">
    <div className="db-shell db-instrument-story-layout">
      <div className="db-instrument-story-copy" data-reveal>
        <span className="db-micro">One company · exact instruments</span>
        <h2>Know what you’re<br/>looking at.</h2>
        <p>AAPL can exist as different onchain products. Daybreak puts those differences in front of you before the quote, wallet or community access.</p>
        <ol className="db-journey-list">
          {STEPS.map((step) => <li key={step.number}>
            <span>{step.number}</span>
            <div><strong>{step.title}</strong><p>{step.body}</p></div>
          </li>)}
        </ol>
        <Link className="db-button db-blue-button" href="/app?stock=AAPL">Open Apple in Daybreak <ArrowRight size={17}/></Link>
      </div>

      <div className="db-instrument-demo" data-reveal aria-label="Example Apple instrument comparison">
        <header className="db-instrument-demo-head">
          <div><StockIcon ticker="AAPL" size={54}/><div><span>Apple</span><strong>AAPL</strong></div></div>
          <span className="db-demo-live"><i/> Company view</span>
        </header>

        <div className="db-demo-context">
          <span><Newspaper size={15}/> Company news and market context</span>
          <strong>$336.48</strong>
          <small>Oracle reference · not a trade quote</small>
        </div>

        <div className="db-demo-label"><span>Choose the exact asset</span><span>Same company · different products</span></div>
        <div className="db-demo-instruments">
          <article>
            <span className="db-demo-check">B</span>
            <small>Base · Coinbase</small>
            <strong>AAPLc</strong>
            <p>Coinbase tokenized stock</p>
            <b>Fund with USDC on Base</b>
            <code>{short('0xb200000000000000000000c2e324d24d7eecd1fb')}</code>
          </article>
          <article className="is-selected">
            <span className="db-demo-check"><Check size={12}/></span>
            <small>Solana · Backed Finance</small>
            <strong>AAPLx</strong>
            <p>xStocks tracker certificate</p>
            <b>Fund with USDC on Solana</b>
            <code>{short('XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp')}</code>
          </article>
        </div>

        <div className="db-demo-quote">
          <div><span>25 USDC</span><ArrowRight size={15}/><strong>0.07402519 AAPLx</strong></div>
          <dl>
            <div><dt>Minimum received</dt><dd>0.07328494 AAPLx</dd></div>
            <div><dt>Quote provider</dt><dd>Jupiter · Solana</dd></div>
          </dl>
          <p><CircleCheck size={15}/> Review only · no transaction created</p>
        </div>

        <footer><LockKeyhole size={14}/><span>Exact registered assets. Private holding verification.</span><Link href="/app?stock=AAPL" aria-label="Open the live Apple workspace">Live workspace <ArrowUpRight size={13}/></Link></footer>
      </div>
    </div>
  </section>;
}
