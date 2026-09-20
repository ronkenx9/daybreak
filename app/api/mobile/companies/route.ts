import { TOKENS } from '@/lib/base/tokens';
import { publicThesisInstruments } from '@/lib/theses/instruments';

export const dynamic = 'force-static';

export function GET() {
  const solana = new Map(publicThesisInstruments().map((instrument) => [instrument.ticker, instrument]));
  return Response.json({ items: TOKENS.map((token) => ({
    ticker: token.ticker, name: token.name, baseSymbol: token.onchainSymbol,
    solanaSymbol: solana.get(token.ticker)?.symbol ?? null,
    solanaInstrumentId: solana.get(token.ticker)?.id ?? null,
  })) }, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' } });
}
