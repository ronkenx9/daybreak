import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicThesisPage from '@/components/daybreak/theses/PublicThesisPage';
import type { ThesisInstrumentView, ThesisView } from '@/components/daybreak/theses/types';
import { getPublicThesis } from '@/lib/db/repo-theses';
import { publicThesisInstruments } from '@/lib/theses/instruments';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const thesis = await getPublicThesis((await params).slug);
  if (!thesis) return { title: 'Thesis not found' };
  return { title: thesis.title, description: thesis.summary, alternates: { canonical: `/theses/${thesis.slug}` }, openGraph: { type: 'article', title: thesis.title, description: thesis.summary, url: `/theses/${thesis.slug}` } };
}

export default async function Page({ params }: Props) {
  const thesis = await getPublicThesis((await params).slug) as ThesisView | null;
  if (!thesis) notFound();
  const instrument = publicThesisInstruments().find((item)=>item.id===thesis.instrumentId) as ThesisInstrumentView | undefined;
  return <PublicThesisPage thesis={thesis} instrument={instrument}/>;
}
