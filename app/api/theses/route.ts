import { requireUser, readJsonObject, errorResponse, HttpError } from '@/lib/account/auth-server';
import { createThesisDraft, listPublishedTheses } from '@/lib/db/repo-theses';
import { normalizeThesisDraft, thesisSlug } from '@/lib/theses/model';
import { requireThesisInstrument } from '@/lib/theses/instruments';
import { requireWriteCapacity } from '@/lib/account/request-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 40);
    const items = await listPublishedTheses(Number.isFinite(limit) ? limit : 40);
    return Response.json({ items }, { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40' } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    requireWriteCapacity(user.id);
    const input = normalizeThesisDraft(await readJsonObject(request, 10_000));
    const instrument = requireThesisInstrument(input.instrumentId, 'create');
    const thesis = await createThesisDraft(user.id, thesisSlug(input.title), instrument.companyId, input);
    return Response.json({ thesis, instrument: { ...instrument, tokenBadge: undefined } }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && !('status' in error)) return errorResponse(new HttpError(400, error.message));
    return errorResponse(error);
  }
}
