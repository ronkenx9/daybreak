// Lane B — blast from the past: famous old memes, scandals and funny moments
// tied to LIVE stocks in TOKENS. Pick the stock, pull a moment from its past.
// These are cultural memories, not news — the UI surfaces them under a
// "Blast from the past" label and the moment text below always says throwback.
export interface PastMoment {
  ticker: string; // must match a TOKENS ticker so it pairs with the stock
  title: string; // the moment, e.g. "Antennagate"
  blurb: string; // one-line hook shown on the chip
}

export const PAST_MOMENTS: PastMoment[] = [
  { ticker: 'AAPL', title: 'Antennagate', blurb: '2010: "you\'re holding it wrong." Free bumpers for everyone.' },
  { ticker: 'AAPL', title: 'The $999 stand', blurb: 'Apple selling a monitor stand for a grand. Peak Apple.' },
  { ticker: 'AMZN', title: 'The door desks', blurb: 'Bezos built the empire on desks made of doors.' },
  { ticker: 'AMZN', title: 'Relentless.com', blurb: 'Type it in. It still goes to Amazon.' },
  { ticker: 'GOOGL', title: 'Gmail Fools launch', blurb: '2004: 1GB free email on April 1st. Everyone thought it was a joke.' },
  { ticker: 'GOOGL', title: "Don't be evil era", blurb: 'The old motto, now a meme about the motto.' },
  { ticker: 'NVDA', title: "Jensen's jacket", blurb: 'The leather jacket is the product launch.' },
  { ticker: 'NVDA', title: 'The SEGA years', blurb: 'Before AI, NVIDIA nearly died on a SEGA chip.' },
  { ticker: 'TSLA', title: 'Rogan 2018', blurb: 'One puff, one very red trading day.' },
  { ticker: 'TSLA', title: 'Funding secured', blurb: '"Am considering taking Tesla private at $420." An all-timer.' },
  { ticker: 'META', title: 'Senator, we sell ads', blurb: 'The hearings heard round the timeline.' },
  { ticker: 'META', title: 'The metaverse pivot', blurb: 'Facebook died so legs could render badly.' },
  { ticker: 'MSFT', title: 'DEVELOPERS chant', blurb: 'Ballmer sweating through the most unhinged keynote ever.' },
  { ticker: 'MSFT', title: 'Vista era', blurb: 'An operating system that asked permission for everything.' },
  { ticker: 'COIN', title: 'Super Bowl QR', blurb: '2022: a bouncing QR code crashed the app in 60 seconds.' },
  { ticker: 'CRCL', title: 'Depeg weekend', blurb: 'March 2023: USDC at $0.87 and CT holding its breath.' },
  { ticker: 'INTC', title: 'Pentium FDIV bug', blurb: '1994: a chip that couldn\'t divide. A $475M recall.' },
  { ticker: 'INTC', title: 'Intel Inside jingle', blurb: 'Four notes more famous than most bands.' },
  { ticker: 'MSTR', title: 'Laser eyes', blurb: 'Saylor will simply buy more. Forever.' },
  { ticker: 'SNDK', title: 'The flash crash era', blurb: 'Memory got cheap, the memes got cheaper.' },
  { ticker: 'SPCX', title: 'Rapid unscheduled disassembly', blurb: 'Starship fireworks, twice, on purpose-ish.' },
];

export function momentsFor(ticker: string): PastMoment[] {
  return PAST_MOMENTS.filter((m) => m.ticker === ticker);
}

// Same output contract as memeMoment(): a starter meme brief, ≤800 chars.
// Always framed as a throwback so it never reads as live news.
export function nostalgiaMoment(entry: PastMoment): string {
  return `A funny, shareable throwback meme about ${entry.ticker}'s famous past moment: ${entry.title}. The memory: ${entry.blurb} Make it bold, nostalgic, and expressive — clearly a tribute to the past, not news.`.slice(0, 800);
}
