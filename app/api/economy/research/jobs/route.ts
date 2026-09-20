import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { failResearchJob, finishResearchJob, startResearchJob } from '@/lib/db/repo-economy';
import { generateResearchBrief, loadResearchSources, researchGatewayReady, supportedResearchSymbol } from '@/lib/economy/research';
import { researchMember } from '@/lib/economy/membership';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    const body = await readJsonObject(req);
    const symbol = typeof body.symbol === 'string' ? supportedResearchSymbol(body.symbol) : null;
    const key = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
    const maxCostCents = body.maxCostCents;
    if (!symbol || !/^[0-9a-f-]{36}$/i.test(key) || !Number.isInteger(maxCostCents) || Number(maxCostCents) < 0 || Number(maxCostCents) > 25) throw new HttpError(400, 'Choose a supported stock and review the price.');
    if (!await researchGatewayReady()) throw new HttpError(503, 'Research briefs are temporarily unavailable. No credits were used.');
    const { job, created } = await startResearchJob(user.id, symbol, key, Number(maxCostCents), await researchMember(req));
    if (!created) {
      if (job.status === 'failed') throw new HttpError(409, 'That brief did not complete and its credits were returned. Start a new brief.');
      return Response.json({ job }, { status: job.status === 'pending' ? 202 : 200, headers: { 'Cache-Control': 'private, no-store' } });
    }
    try {
      const sources = await loadResearchSources(symbol);
      const result = await generateResearchBrief(symbol, sources);
      const completed = await finishResearchJob(user.id, job.id, result);
      return Response.json({ job: completed }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
      await failResearchJob(user.id, job.id);
      throw new HttpError(503, error instanceof Error ? error.message : 'Research could not complete. Credits were returned.');
    }
  } catch (error) { return errorResponse(error instanceof Error && !('status' in error) ? new HttpError(409, error.message) : error); }
}
