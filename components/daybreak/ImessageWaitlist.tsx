'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { BrandMark, CharacterCrew, StockIcon, Wordmark } from './Identity';
import { IMESSAGE_WAITLIST_CONSENT } from '@/lib/imessage/waitlist';

type JoinResult = { joined: true; status?: string; phone?: string } | { error: string };

export default function ImessageWaitlist() {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'submitting' | 'joined'>('idle');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'submitting') return;
    const form = new FormData(event.currentTarget);
    setState('submitting');
    setError('');
    try {
      const response = await fetch('/api/imessage/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, consent, company: form.get('company') }),
      });
      const result = await response.json() as JoinResult;
      if (!response.ok || 'error' in result) throw new Error('error' in result ? result.error : 'Could not join the waitlist.');
      setMaskedPhone(result.phone ?? 'your number');
      setState('joined');
    } catch (caught) {
      setState('idle');
      setError(caught instanceof Error ? caught.message : 'Could not join the waitlist.');
    }
  }

  return (
    <main className="db-imessage-page">
      <div className="db-imessage-shell">
        <nav className="db-imessage-nav" aria-label="Waitlist navigation">
          <Wordmark />
          <Link href="/">Back to Daybreak</Link>
        </nav>

        <section className="db-imessage-layout">
          <div className="db-imessage-copy" data-reveal>
            <span className="db-micro">Daybreak for iMessage · Private beta</span>
            <h1>Markets, theses and your Circles. One text away.</h1>
            <p className="db-imessage-lede">
              Ask Daybreak about a stock, catch up on company news, or find a public conviction market without leaving Messages.
            </p>

            {state === 'joined' ? (
              <div className="db-imessage-success" role="status" aria-live="polite">
                <span className="db-imessage-success-mark"><BrandMark size={28} /></span>
                <div>
                  <span className="db-micro">You’re on the list</span>
                  <h2>Watch for a message from Daybreak.</h2>
                  <p>We’ll activate {maskedPhone} in small batches. Once the welcome message arrives, reply in that thread to start.</p>
                </div>
              </div>
            ) : (
              <form className="db-imessage-form" onSubmit={submit} noValidate>
                <label htmlFor="imessage-phone">Your iMessage number</label>
                <div className="db-imessage-field">
                  <input
                    id="imessage-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+1 415 555 0142"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    aria-describedby="imessage-phone-note imessage-error"
                    required
                  />
                  <button type="submit" disabled={state === 'submitting' || !phone || !consent}>
                    {state === 'submitting' ? 'Joining…' : 'Join waitlist'}
                  </button>
                </div>
                <span id="imessage-phone-note" className="db-imessage-field-note">Include your country code. This must be a number connected to iMessage.</span>
                <input className="db-imessage-honeypot" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <label className="db-imessage-consent">
                  <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
                  <span>{IMESSAGE_WAITLIST_CONSENT}</span>
                </label>
                <p id="imessage-error" className="db-imessage-error" aria-live="polite">{error}</p>
              </form>
            )}

            <ol className="db-imessage-steps" aria-label="How access works">
              <li><span>01</span><p><strong>Request access</strong>Leave the number you use for iMessage.</p></li>
              <li><span>02</span><p><strong>Get activated</strong>We add early users in small batches.</p></li>
              <li><span>03</span><p><strong>Reply to Daybreak</strong>The welcome message becomes your market thread.</p></li>
            </ol>
          </div>

          <div className="db-imessage-art" aria-label="A preview of Daybreak answering stock questions inside Messages" data-reveal>
            <div className="db-imessage-art-top">
              <span className="db-micro db-micro-light">Live Daybreak context</span>
              <span className="db-imessage-beta">Invite access</span>
            </div>
            <div className="db-imessage-chat">
              <div className="db-imessage-contact">
                <span><BrandMark size={26} /></span>
                <div><strong>Daybreak</strong><small>iMessage agent</small></div>
              </div>
              <div className="db-message is-user">What’s happening with NVDA?</div>
              <div className="db-message is-daybreak">
                <div className="db-message-stock"><StockIcon ticker="NVDA" size={36}/><span><strong>NVIDIA</strong><small>Market + Circle context</small></span></div>
                <p>I found the latest company news, its supported stock tokens, and three public theses.</p>
                <span className="db-message-link">Open the NVIDIA view</span>
              </div>
              <div className="db-message is-user is-short">Show me the theses.</div>
              <div className="db-message-typing" aria-hidden="true"><i/><i/><i/></div>
            </div>
            <CharacterCrew className="db-imessage-crew" />
            <span className="db-imessage-orbit is-aapl"><StockIcon ticker="AAPL" size={48}/></span>
            <span className="db-imessage-orbit is-tsla"><StockIcon ticker="TSLA" size={44}/></span>
          </div>
        </section>

        <footer className="db-imessage-footer">
          <span>Early access is free.</span>
          <span>Your number is used only to manage Daybreak iMessage access.</span>
        </footer>
      </div>
    </main>
  );
}
