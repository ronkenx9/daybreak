'use client';
import { useState } from 'react';
import { Gift } from 'lucide-react';
import ReceiveStockToggle from './ReceiveStockToggle';
import SendStockLauncher from './SendStockLauncher';

/** Profile panel: send xStocks to people in your circles, and choose whether they can send to you. */
export default function StockGifting({ signedIn, onSignIn }: { signedIn: boolean; onSignIn: () => void }) {
  const [open, setOpen] = useState(false);
  return <section className="db-you-panel db-stock-gifting" aria-labelledby="stock-gifting-title">
    <header><h2 id="stock-gifting-title">Send &amp; receive stock</h2><p>Send real xStocks on X Layer to people in your circles, straight from your wallet. Daybreak never holds your stock.</p></header>
    {signedIn ? <>
      <ReceiveStockToggle/>
      <div className="db-stock-gifting-actions"><button className="db-button db-blue-button" onClick={() => setOpen(true)}><Gift size={15}/> Send stock</button><span className="db-small-note">Pick a circle, pick a member, send.</span></div>
      {open && <SendStockLauncher onClose={() => setOpen(false)}/>}
    </> : <div className="db-stock-gifting-actions"><button className="db-button db-blue-button" onClick={onSignIn}>Sign in to send stock</button></div>}
  </section>;
}
