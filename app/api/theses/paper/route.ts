import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { createPublicPaperThesis, getPublicThesis } from '@/lib/db/repo-theses';
import { requireThesisInstrument } from '@/lib/theses/instruments';
import { normalizePublicPaperThesis } from '@/lib/theses/paper';
import { thesisSlug } from '@/lib/theses/model';

export const dynamic = 'force-dynamic';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    requireWriteCapacity(user.id);
    const body = await readJsonObject(request, 4_096);
    if (typeof body.creationIntentId !== 'string' || !uuid.test(body.creationIntentId)) throw new HttpError(400, 'Invalid paper creation intent');
    const input = normalizePublicPaperThesis(body);
    const instrument = requireThesisInstrument(input.instrumentId, 'create');
    const created = await createPublicPaperThesis(user.id, thesisSlug(input.title), instrument.companyId, input, body.creationIntentId);
    const thesis = await getPublicThesis(created.id);
    if (!thesis) throw new HttpError(500, 'Paper thesis was created but could not be loaded');
    return Response.json({ thesis }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'PAPER_THESIS_DAILY_LIMIT') return errorResponse(new HttpError(429, 'You can publish up to five paper theses per day'));
    if (error instanceof Error && error.message === 'PAPER_CREATION_INTENT_REUSED') return errorResponse(new HttpError(409, 'This publication retry no longer matches its original thesis'));
    if (error instanceof Error && !('status' in error)) return errorResponse(new HttpError(400, error.message));
    return errorResponse(error);
  }
}
