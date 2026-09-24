import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Wordmark } from '@/components/daybreak/Identity';

export const metadata: Metadata = {
  title: 'The stock is only the beginning — Daybreak',
  description: 'The Daybreak thesis: hold stocks, find your circle, create culture, earn more stocks.',
  openGraph: {
    title: 'The stock is only the beginning',
    description: 'Hold stocks. Find your circle. Create culture. Earn more stocks.',
    type: 'article',
    images: [{ url: '/assets/campaign/daybreak-flywheel-banner.png', width: 2172, height: 724, alt: 'The Daybreak community flywheel' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The stock is only the beginning',
    description: 'Hold stocks. Find your circle. Create culture. Earn more stocks.',
    images: ['/assets/campaign/daybreak-flywheel-banner.png'],
  },
};

export default function ThesisPage() {
  return <main className="db-thesis">
    <nav className="db-thesis-nav db-shell"><Wordmark /><Link href="/app/groups" className="db-button db-blue-button">Find my circle <ArrowRight size={16}/></Link></nav>
    <header className="db-thesis-head db-shell">
      <Link href="/" className="db-text-link"><ArrowLeft size={15}/> Daybreak</Link>
      <span className="db-micro">The Daybreak thesis</span>
      <h1>The stock is only<br/>the beginning.</h1>
      <p className="db-thesis-deck">hold stocks. find your circle. create culture. earn more stocks.</p>
      <img src="/assets/campaign/daybreak-flywheel-banner.png" alt="Daybreak characters gathered around a stock token as value circulates through their community" width="2172" height="724" />
    </header>
    <article className="db-thesis-body">
      <p className="db-thesis-lede">the first version of Daybreak tried to explain everything.</p>
      <p>tokenized stocks. news. memestocks. liquidity pools. community tokens. circles.</p>
      <p>all of those things belonged in the product, but together they made the idea harder to see.</p>
      <p>then the simple version clicked:</p>
      <blockquote>hold stocks.<br/>find your circle.<br/>create culture.<br/>earn more stocks.</blockquote>
      <p>that is Daybreak.</p>

      <h2>a wallet can be more than a balance</h2>
      <p>today, owning a tokenized stock is mostly a solitary experience. you buy it. you watch the chart. you wait.</p>
      <p>the asset lives onchain, but the people around it are still scattered across timelines, group chats and trading terminals.</p>
      <p>Daybreak turns the holding into a social primitive.</p>
      <p>connect a wallet. verify the supported tokenized stocks inside it. unlock circles built around those holdings.</p>
      <p>the circle never needs to know your balance or expose your wallet to other members. it only needs a short-lived answer to one question:</p>
      <p><strong>do you hold the stock?</strong></p>
      <p>if yes, the room opens.</p>

      <h2>from ownership to belonging</h2>
      <p>an NVDA token can be more than price exposure. it can be access to people tracking chips, AI infrastructure and the next earnings call.</p>
      <p>a TSLA token can open a room for the people following autonomy, batteries and the culture around the company.</p>
      <p>members can share news, discuss what matters, create memes from live stories and launch community tokens paired against the stock that brought them together.</p>
      <p>the stock becomes the shared context. the circle creates the culture.</p>
      <p>that is the difference between putting an equity onchain and making it native to the internet.</p>

      <h2>culture is distribution</h2>
      <p>tokenized equities do not only need more places to buy them. they need native onchain culture and distribution.</p>
      <p>markets already move through stories, identities and communities. crypto made that visible. a ticker can become a language. a meme can move faster than a research report. a group of holders can turn passive exposure into an active network.</p>
      <p>news gives the circle something to react to. creation gives the circle something to spread. stock-paired tokens and liquidity give that culture an onchain market.</p>
      <p><strong>that is not a social layer sitting beside the asset. that is distribution built around the asset.</strong></p>

      <figure><img src="/assets/campaign/daybreak-flywheel-social.png" alt="The Daybreak flywheel represented by holder characters, a wallet, conversation and creation orbiting a stock token" width="1254" height="1254"/><figcaption>one loop, from ownership to belonging and back again.</figcaption></figure>

      <h2>the Daybreak flywheel</h2>
      <ol>
        <li>hold a supported tokenized stock.</li>
        <li>verify it without publishing your position size.</li>
        <li>enter or create the matching circle.</li>
        <li>turn news into conversation, memes and community markets.</li>
        <li>route protocol fees back into tokenized stocks for the community.</li>
      </ol>
      <p>the first four steps are the product we are building now.</p>
      <p>the final step is the protocol layer we are building toward: a transparent community treasury where fees generated by Daybreak activity can purchase tokenized stocks and fund future distributions to active circles and eligible <code>$DAYC</code> participants.</p>
      <p>no vague points system. no made-up yield number.</p>
      <p>the treasury should show what came in, what stock was purchased and what was distributed. publicly.</p>

      <h2>what $DAYC is for</h2>
      <p><code>$DAYC</code> should not become a second product competing with Daybreak. it should accelerate the same loop.</p>
      <p>trade <code>$DAYC</code>. activity creates fees. those fees can become stocks for the community.</p>
      <p><strong>Daybreak is where tokenized-stock holders find their people.</strong></p>
      <p><strong><code>$DAYC</code> helps the community earn its way back into stocks.</strong></p>

      <h2>the opening bell</h2>
      <p>we do not need to rebuild a brokerage with a chat tab.</p>
      <p>we need to build the place that only becomes possible when stocks, identity, culture and markets all live onchain.</p>
      <p>the stock is the proof.<br/>the circle is the product.<br/>the culture is the distribution.<br/>the fees bring it home.</p>
      <p>the market is open. find your circle. 🔧</p>
      <Link href="/app/groups" className="db-button db-blue-button db-thesis-cta">Find my circle <ArrowRight size={17}/></Link>
    </article>
  </main>;
}
