import type { Metadata } from 'next';
import StatsDashboard from '@/components/daybreak/StatsDashboard';

export const metadata: Metadata = {
  title: 'Daybreak by the numbers',
  description: 'Live traction for Daybreak on Base — accounts, launches, creations and the DAYC token.',
};

export default function StatsPage() {
  return <StatsDashboard />;
}
