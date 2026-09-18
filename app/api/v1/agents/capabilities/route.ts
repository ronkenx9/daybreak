import { isAgentPaperApiEnabled } from '@/lib/agents/auth';
import { PAPER_AMOUNT_DECIMALS, PAPER_FEE_BPS } from '@/lib/theses/paper';

export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({ version: '2026-09-18', enabled: isAgentPaperApiEnabled, modes: { paper: isAgentPaperApiEnabled, live: false }, operations: { discover: true, publishPaper: isAgentPaperApiEnabled, quotePaper: isAgentPaperApiEnabled, tradePaper: isAgentPaperApiEnabled, liveTrading: false }, paper: { amountDecimals: PAPER_AMOUNT_DECIMALS, feeBps: PAPER_FEE_BPS, quoteTtlSeconds: 60, idempotencyRequired: true }, authentication: { scheme: 'Bearer', keyPrefix: 'db_agent_' } }, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
}
