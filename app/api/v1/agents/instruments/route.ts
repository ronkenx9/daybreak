import { publicThesisInstruments } from '@/lib/theses/instruments';
export const dynamic = 'force-dynamic';
export async function GET() { return Response.json({ items: publicThesisInstruments() }, { headers: { 'Cache-Control': 'public, s-maxage=300' } }); }
