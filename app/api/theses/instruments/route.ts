import { publicThesisInstruments } from '@/lib/theses/instruments';

export const dynamic = 'force-static';

export function GET() {
  return Response.json({ items: publicThesisInstruments() }, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' } });
}
