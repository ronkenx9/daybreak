import Link from 'next/link';
import LandingStories from '@/components/daybreak/LandingStories';
import { ArrowUpRight, ArrowRight, WalletCards, Users, Sparkles, Repeat2, Github } from 'lucide-react';
import ShareRedirect from '@/components/daybreak/ShareRedirect';
import { Wordmark, AvatarStack, StockIcon } from '@/components/daybreak/Identity';
import CommunitySpotlight from '@/components/daybreak/CommunitySpotlight';

import { Lines } from '@/components/daybreak/Lines';

const PROOF = [
  { value: '01', label: 'Verify what you hold' },
  { value: '02', label: 'Unlock your circles' },
  { value: '03', label: 'Create the culture' },
  { value: '04', label: 'Bring value home' },
];

const DISCOVER = [
  {
    icon: WalletCards,
    step: 'Hold',
    title: 'Your wallet is the invitation.',
    body: 'Verify a supported tokenized stock without publishing your balance or exposing your wallet to other members.',
  },
  {
    icon: Users,
    step: 'Gather',
    title: 'Find the room you already belong in.',
    body: 'A verified holding unlocks the matching circle: real people, shared context and the stories moving the stock.',
  },
  {
    icon: Sparkles,
    step: 'Create',
    title: 'Turn the news cycle into culture.',
    body: 'Discuss the story, make the meme, or launch a community token paired with the stock that started it.',
  },
  {
    icon: Repeat2,
    step: 'Return',
    title: 'Let activity flow back into stocks.',
    body: 'The next protocol layer routes fees into a transparent stock treasury for future community distributions.',
    planned: true,
  },
];

const CIRCLES = [
  { ticker: 'NVDA', name: 'Accelerated computing', note: 'Silicon, data centres and the people watching them.' },
  { ticker: 'SBUX', name: 'The morning ritual', note: 'For anyone whose day starts with a cup.' },
  { ticker: 'NFLX', name: 'Everything we watch', note: 'Streaming, studios and what gets made next.' },
];

export default function Landing() {
  return (
    <main className="db-landing">
      <ShareRedirect />

      <section className="db-hero">
        <div className="db-shell">
          <nav className="db-site-nav">
            <Wordmark />
            <div className="db-site-links">
              <a href="#flywheel">The flywheel</a>
              <a href="#circles">Find your people</a>
              <Link href="/thesis">Read the thesis</Link>
            </div>
            <Link className="db-nav-cta" href="/app">
              Open app <ArrowUpRight size={15} />
            </Link>
          </nav>

          <div className="db-hero-copy" data-reveal>
            <span className="db-micro db-micro-light" style={{ '--i': 0 } as React.CSSProperties}>
              The social layer for tokenized stocks
            </span>
            <h1>
              <Lines lines={['Hold the stock.', 'Find your people.']} from={1} />
            </h1>
            <p style={{ '--i': 4 } as React.CSSProperties}>
              Verify your holdings. Unlock the matching circle. Turn market news into
              conversation, culture and community markets.
            </p>
            <div className="db-hero-actions" style={{ '--i': 5 } as React.CSSProperties}>
              <Link className="db-button db-white-button" href="/app/groups">
                Find my circle <ArrowRight size={17} />
              </Link>
              <Link className="db-button db-ghost-button" href="/thesis">
                Read the thesis <ArrowUpRight size={17} />
              </Link>
            </div>
            <span className="db-caption" style={{ '--i': 6 } as React.CSSProperties}>
              Your position size stays private. The circle only sees the stocks you choose to verify.
            </span>
          </div>
        </div>

        <div className="db-flywheel-hero-art" aria-hidden="true">
          <img src="/assets/campaign/daybreak-flywheel-banner.png" alt="" width="2172" height="724" />
        </div>
      </section>

      <section className="db-proof db-band-blue">
        <div className="db-shell db-proof-row" data-reveal>
          {PROOF.map((item, i) => (
            <div
              key={item.label}
              className="db-proof-item"
              style={{ '--i': i } as React.CSSProperties}
            >
              <strong>
                <span>{item.value}</span>
              </strong>
              <span className="db-micro">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="flywheel" className="db-section db-loop-section">
        <div className="db-shell">
          <div className="db-section-head" data-reveal>
            <span className="db-micro">One product. One loop.</span>
            <h2>
              <Lines lines={['The stock is proof.', 'The circle is the product.']} />
            </h2>
            <p>
              Daybreak turns a passive holding into a place to belong, create and build an onchain market together.
            </p>
          </div>

          <div className="db-loop-grid">
            {DISCOVER.map(({ icon: Icon, step, title, body, planned }, i) => (
              <article key={step} className="db-loop-step" data-reveal style={{ '--i': i } as React.CSSProperties}>
                <div className="db-loop-index"><span>0{i + 1}</span><Icon size={22}/></div>
                <span className="db-micro">{step}{planned ? ' · next' : ''}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <div className="db-loop-line" aria-label="Daybreak loop">
            <span>hold stocks</span><ArrowRight size={16}/><span>find your circle</span><ArrowRight size={16}/><span>create culture</span><ArrowRight size={16}/><span>earn more stocks</span>
          </div>
        </div>
      </section>

      <section id="circles" className="db-section db-band-blue">
        <div className="db-shell db-split">
          <div className="db-section-head" data-reveal>
            <h2>
              <Lines lines={['Same holding.', 'A shared room.']} />
            </h2>
            <p>
              Enter with proof of a supported holding. Meet people following the same company,
              share the latest story and build the culture around it.
            </p>
            <Link className="db-button db-blue-button" href="/app/groups">
              Explore circles <ArrowRight size={17} />
            </Link>
            <span className="db-section-note">Balances and wallet addresses are never shown to other members.</span>
          </div>

          <ul className="db-circle-list">
            {CIRCLES.map((circle, i) => (
              <li
                key={circle.ticker}
                className="db-circle-row"
                data-reveal
                style={{ '--i': i } as React.CSSProperties}
              >
                <StockIcon ticker={circle.ticker} size={46} />
                <div className="db-circle-body">
                  <h3>{circle.name}</h3>
                  <p>{circle.note}</p>
                </div>
                <div className="db-circle-side">
                  <AvatarStack />
                  <span className="db-chip">Open circle</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="db-section db-section-tint">
        <div className="db-shell">
          <CommunitySpotlight />
        </div>
      </section>

      <LandingStories />

      <section className="db-cta">
        <div className="db-shell db-cta-inner" data-reveal>
          <div>
            <span className="db-micro db-micro-light">Take a look around</span>
            <h2>
              <Lines lines={['The market is open.', 'Find your circle.']} />
            </h2>
          </div>
          <div className="db-hero-actions" style={{ '--i': 3 } as React.CSSProperties}>
            <Link className="db-button db-white-button" href="/app">
              Enter Daybreak <ArrowUpRight size={17} />
            </Link>
            <Link className="db-button db-ghost-button" href="/thesis">
              Read the thesis <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="db-dawn-footer">
        <div className="db-shell db-dawn-top">
          <div className="db-dawn-brand">
            <Wordmark />
            <p>Hold the stock.<br />Find your people.</p>
            <div className="db-dawn-social">
              <a href="https://x.com/Daybreakcircles" target="_blank" rel="noreferrer" aria-label="Daybreak on X">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg>
              </a>
              <a href="https://github.com/ronkenx9/daybreak" target="_blank" rel="noreferrer" aria-label="Daybreak on GitHub"><Github size={18} /></a>
            </div>
          </div>
          <nav aria-label="Explore" className="db-dawn-col">
            <h3>Explore</h3>
            <Link href="/app">Discover companies</Link>
            <Link href="/app/groups">Find a circle</Link>
            <Link href="/app/holdings">Your holdings</Link>
            <Link href="/app/profile">Make it yours</Link>
          </nav>
          <nav aria-label="Learn" className="db-dawn-col">
            <h3>Learn</h3>
            <Link href="/references">Design direction</Link>
            <Link href="/thesis">The Daybreak thesis</Link>
            <Link href="/app/world">Explore the room</Link>
            <a href="https://github.com/ronkenx9/daybreak/blob/main/docs/FUTURE-PLANS.md" target="_blank" rel="noreferrer">Our roadmap <ArrowUpRight size={12} /></a>
          </nav>
          <nav aria-label="Project" className="db-dawn-col">
            <h3>Project</h3>
            <a href="https://github.com/ronkenx9/daybreak" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={12} /></a>
            <a href="https://www.base.org" target="_blank" rel="noreferrer">Built on Base <ArrowUpRight size={12} /></a>
          </nav>
        </div>
        <div className="db-shell db-dawn-copy">
          <span>© {new Date().getFullYear()} Daybreak</span>
          <span>Discovery first. Investment decisions are yours.</span>
        </div>
        <div className="db-dawn-poster">
          <img src="/assets/posters/daybreak-dawn.png" alt="Plush Daybreak characters nestled in blue hills beneath a rising sun and glass orbit" width="1983" height="793" loading="lazy" />
        </div>
      </footer>
    </main>
  );
}
