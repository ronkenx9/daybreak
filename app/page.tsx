import Link from 'next/link';
import LandingStories from '@/components/daybreak/LandingStories';
import { ArrowUpRight, ArrowRight, Compass, Layers, Sun } from 'lucide-react';
import ShareRedirect from '@/components/daybreak/ShareRedirect';
import { Wordmark, AvatarStack, StockIcon, Avatar, CharacterCrew } from '@/components/daybreak/Identity';

import { Lines } from '@/components/daybreak/Lines';

const PROOF = [
  { value: '06', label: 'Companies in the catalog' },
  { value: '6/6', label: 'Relationships with a cited source' },
  { value: 'Base', label: 'Chain 8453' },
  { value: '0', label: 'Wallets needed to explore' },
];

const DISCOVER = [
  {
    icon: Compass,
    title: 'Everyday favorites',
    body: 'The coffee, the laptop, the streaming queue. Start from the things already in your day.',
  },
  {
    icon: Layers,
    title: "Tomorrow's technology",
    body: 'Follow a product down to the silicon, the cloud and the supply chain behind it.',
  },
  {
    icon: Sun,
    title: 'A little curiosity',
    body: 'Every relationship links out to the primary filing or newsroom it came from.',
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
            <Wordmark light />
            <div className="db-site-links">
              <a href="#discover">The experience</a>
              <a href="#circles">Find your people</a>
              <Link href="/references">Our direction</Link>
            </div>
            <Link className="db-nav-cta" href="/app">
              Open app <ArrowUpRight size={15} />
            </Link>
          </nav>

          <div className="db-hero-copy" data-reveal>
            <span className="db-micro db-micro-light" style={{ '--i': 0 } as React.CSSProperties}>
              A fresh way to discover stocks
            </span>
            <h1>
              <Lines lines={['A new day.', 'A little more yours.']} from={1} />
            </h1>
            <p style={{ '--i': 4 } as React.CSSProperties}>
              The companies you love. People who get it. A whole new world to explore.
            </p>
            <div className="db-hero-actions" style={{ '--i': 5 } as React.CSSProperties}>
              <Link className="db-button db-white-button" href="/app">
                Find your daybreak <ArrowRight size={17} />
              </Link>
              <Link className="db-button db-ghost-button" href="/references">
                See our direction <ArrowUpRight size={17} />
              </Link>
            </div>
            <span className="db-caption" style={{ '--i': 6 } as React.CSSProperties}>
              Explore first. No wallet needed.
            </span>
          </div>
        </div>

        <CharacterCrew className="db-landing-crew" />
      </section>

      <section className="db-proof">
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

      <section id="discover" className="db-section">
        <div className="db-shell">
          <div className="db-section-head" data-reveal>
            <h2>
              <Lines lines={['Your interests.', 'A world of possibilities.']} />
            </h2>
            <p>
              Your morning coffee. Your favorite game. The tech on your desk. Discover the businesses
              behind the things that make your day.
            </p>
            <Link className="db-text-link" href="/app">
              Explore the collection <ArrowUpRight size={17} />
            </Link>
          </div>

          <div className="db-card-row">
            {DISCOVER.map(({ icon: Icon, title, body }, i) => (
              <article key={title} className="db-card" data-reveal style={{ '--i': i } as React.CSSProperties}>
                <div className="db-card-art">
                  <Avatar seed={[2,0,4][i]} size={164}/>
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="circles" className="db-section db-section-tint">
        <div className="db-shell db-split">
          <div className="db-section-head" data-reveal>
            <h2>
              <Lines lines={['Different interests.', 'Shared curiosity.']} />
            </h2>
            <p>
              Find your people around the things you love. Explore stocks, shared discoveries and
              a little personality, with sharing always on your terms.
            </p>
            <Link className="db-button db-blue-button" href="/app/groups">
              Explore circles <ArrowRight size={17} />
            </Link>
            <span className="db-section-note">Community screens currently use labeled sample profiles.</span>
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
                  <span className="db-chip">Sample</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <LandingStories />

      <section className="db-cta">
        <div className="db-shell db-cta-inner" data-reveal>
          <div>
            <span className="db-micro db-micro-light">Take a look around</span>
            <h2>
              <Lines lines={['Your next discovery', 'starts here.']} />
            </h2>
          </div>
          <div className="db-hero-actions" style={{ '--i': 3 } as React.CSSProperties}>
            <Link className="db-button db-white-button" href="/app">
              Open Daybreak <ArrowUpRight size={17} />
            </Link>
            <Link className="db-button db-ghost-button" href="/app/world">
              Visit the room <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="db-site-footer">
        <div className="db-shell db-footer-grid" data-reveal>
          <div className="db-footer-brand">
            <Wordmark />
            <p>Discovery first. Investment decisions are yours.</p>
            <span className="db-footer-status">
              <i /> Local product preview
            </span>
          </div>

          <div className="db-footer-col">
            <span className="db-micro">Product</span>
            <Link href="/app">Discover</Link>
            <Link href="/app/groups">Circles</Link>
            <Link href="/app/holdings">Holdings</Link>
            <Link href="/app/world">The room</Link>
          </div>

          <div className="db-footer-col">
            <span className="db-micro">About</span>
            <Link href="/references">Design references</Link>
            <Link href="/app/profile">Your profile</Link>
          </div>

          <div className="db-footer-col">
            <span className="db-micro">Network</span>
            <span>Base · chain 8453</span>
            <span>Six sourced companies</span>
          </div>
        </div>
        <div className="db-shell">
          <small>
            Local product preview. Live trading and community verification are not connected. Avatars,
            circles and holder rankings are labeled samples.
          </small>
        </div>
      </footer>
    </main>
  );
}
