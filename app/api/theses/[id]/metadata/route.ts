import { getPublicMetadata } from '@/lib/db/repo-theses';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const thesis = await getPublicMetadata(id);
  if (!thesis) return Response.json({ error: 'Metadata unavailable' }, { status: 404 });
  return Response.json({
    name: thesis.tokenName,
    symbol: thesis.tokenSymbol,
    description: thesis.summary,
    external_url: `https://www.daybreakcircles.lol/theses/${thesis.id}`,
    attributes: [
      { trait_type: 'Daybreak instrument', value: thesis.instrumentId },
      { trait_type: 'Thesis ID', value: thesis.id },
    ],
  }, { headers: { 'Cache-Control': thesis.status === 'ready' ? 'no-store' : 'public, max-age=300, immutable' } });
}
