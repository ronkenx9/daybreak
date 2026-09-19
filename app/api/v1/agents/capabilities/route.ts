import { isAgentFlashApiEnabled, isAgentPaperApiEnabled } from '@/lib/agents/auth';
import { PAPER_AMOUNT_DECIMALS, PAPER_FEE_BPS } from '@/lib/theses/paper';

export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({ version: '2026-09-19', enabled: isAgentPaperApiEnabled || isAgentFlashApiEnabled, modes: { paper: isAgentPaperApiEnabled, live: isAgentFlashApiEnabled }, operations: { discover: true, publishPaper: isAgentPaperApiEnabled, quotePaper: isAgentPaperApiEnabled, tradePaper: isAgentPaperApiEnabled, liveTrading: isAgentFlashApiEnabled, flashLimitOrders: isAgentFlashApiEnabled }, paper: { amountDecimals: PAPER_AMOUNT_DECIMALS, feeBps: PAPER_FEE_BPS, quoteTtlSeconds: 60, idempotencyRequired: true }, flash: { chain: 'solana', quoteAsset: 'USDC', orderType: 'limit', walletSignatureRequired: true, ownerOptInRequired: true, idempotencyRequired: true }, authentication: { scheme: 'Bearer', keyPrefix: 'db_agent_' } }, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
}
