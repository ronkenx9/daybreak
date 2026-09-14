import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'App',
  description: 'Explore tokenized stocks, sync holdings, and join wallet-verified circles on Daybreak.',
  alternates: { canonical: '/app' },
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
