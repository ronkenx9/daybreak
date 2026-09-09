'use client';

import Dialog from './Dialog';
import { useAccountState, type LoginMethod } from './AccountProvider';

// Apple is omitted until its OAuth credentials are set in the Privy dashboard —
// showing it before then dead-ends at Privy's "login not allowed". Re-add once
// configured. Every method here is one the app has verified is enabled.
const METHODS: { id: LoginMethod; label: string }[] = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'passkey', label: 'Use a passkey' },
  { id: 'wallet', label: 'Continue with a wallet' },
];

export default function SignInSheet({ onClose }: { onClose: () => void }) {
  const { configured, ready, login } = useAccountState();
  return (
    <Dialog label="Sign in to Daybreak" onClose={onClose}>
      <div className="db-signin">
        <span className="db-micro">Your Daybreak account</span>
        <h2>Keep what you discover.</h2>
        <p>Save companies, join circles, and carry them across devices. You can keep looking around without one.</p>
        {configured ? (
          <div className="db-signin-methods">
            {METHODS.map((m) => (
              <button key={m.id} className="db-signin-btn" disabled={!ready} aria-disabled={!ready}
                onClick={() => { if (!ready) return; login(m.id); onClose(); }}>
                {m.label}
              </button>
            ))}
            {!ready && <span className="db-small-note" role="status">Preparing secure sign-in…</span>}
          </div>
        ) : (
          <div className="db-signin-note">
            <strong>Sign-in isn’t available right now.</strong>
            <span>You can keep exploring — everything here works without an account. Please try again in a little while.</span>
          </div>
        )}
        <p className="db-small-note">A wallet login proves ownership with a signature. It never moves funds or approves a trade.</p>
      </div>
    </Dialog>
  );
}
