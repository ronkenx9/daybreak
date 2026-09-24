import type { Metadata } from 'next';
import ImessageWaitlist from '@/components/daybreak/ImessageWaitlist';

export const metadata: Metadata = {
  title: 'Daybreak for iMessage',
  description: 'Join the private beta for Daybreak’s iMessage market and conviction agent.',
  alternates: { canonical: '/imessage' },
};

export default function ImessagePage() {
  return <ImessageWaitlist />;
}
