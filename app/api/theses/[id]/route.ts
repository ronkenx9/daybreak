import { requireUser, readJsonObject, errorResponse, HttpError } from '@/lib/account/auth-server';
import { getOwnedThesis, getPublicThesis, updateThesisDraft } from '@/lib/db/repo-theses';
import { normalizeThesisDraft } from '@/lib/theses/model';
import { requireThesisInstrument } from '@/lib/theses/instruments';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const published = await getPublicThesis(id);
    if (published) return Response.json({ thesis: published }, { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40' } });
    const user = await requireUser(request);
    const draft = await getOwnedThesis(id, user.id);
    if (!draft) throw new HttpError(404, 'Thesis not found');
    return Response.json({ thesis: draft }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const input = normalizeThesisDraft(await readJsonObject(request, 10_000));
    const instrument = requireThesisInstrument(input.instrumentId, 'create');
    const updated = await updateThesisDraft(id, user.id, instrument.companyId, input);
    if (!updated) throw new HttpError(409, 'Only an unpublished draft can be edited');
    return Response.json({ thesis: updated }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Error && !('status' in error)) return errorResponse(new HttpError(400, error.message));
    return errorResponse(error);
  }
}
