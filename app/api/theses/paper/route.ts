import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { createPublicPaperThesis, getPublicThesis } from '@/lib/db/repo-theses';
import { requireThesisInstrument } from '@/lib/theses/instruments';
import { normalizePublicPaperThesis } from '@/lib/theses/paper';
import { thesisSlug } from '@/lib/theses/model';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    requireWriteCapacity(user.id);
    const input = normalizePublicPaperThesis(await readJsonObject(request, 4_096));
    const instrument = requireThesisInstrument(input.instrumentId, 'create');
    const created = await createPublicPaperThesis(user.id, thesisSlug(input.title), instrument.companyId, input);
    const thesis = await getPublicThesis(created.id);
    if (!thesis) throw new HttpError(500, 'Paper thesis was created but could not be loaded');
    return Response.json({ thesis }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'PAPER_THESIS_DAILY_LIMIT') return errorResponse(new HttpError(429, 'You can publish up to five paper theses per day'));
    if (error instanceof Error && !('status' in error)) return errorResponse(new HttpError(400, error.message));
    return errorResponse(error);
  }
}
