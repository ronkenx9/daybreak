'use client';

import Dialog from './Dialog';
import { useAccountState, type LoginMethod } from './AccountProvider';

const METHODS: { id: LoginMethod; label: string }[] = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'apple', label: 'Continue with Apple' },
  { id: 'passkey', label: 'Use a passkey' },
  { id: 'wallet', label: 'Continue with a wallet' },
];

export default function SignInSheet({ onClose }: { onClose: () => void }) {
  const { configured, login } = useAccountState();
  return (
    <Dialog label="Sign in to Daybreak" onClose={onClose}>
      <div className="db-signin">
        <span className="db-micro">Your Daybreak account</span>
        <h2>Keep what you discover.</h2>
        <p>Save companies, join circles, and carry them across devices. Looking around stays open — no account needed to explore.</p>
        {configured ? (
          <div className="db-signin-methods">
            {METHODS.map((m) => (
              <button key={m.id} className="db-signin-btn" onClick={() => { login(m.id); onClose(); }}>
                {m.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="db-signin-note">
            <strong>Sign-in isn’t switched on yet.</strong>
            <span>Add a Privy app ID (<code>NEXT_PUBLIC_PRIVY_APP_ID</code>) to enable Google, Apple, passkeys and wallet login. Everything else works without it.</span>
          </div>
        )}
        <p className="db-small-note">A wallet login proves ownership with a signature. It never moves funds or approves a trade.</p>
      </div>
    </Dialog>
  );
}
