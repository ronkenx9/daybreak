import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { listChallengeSubmissions, submitChallenge } from '@/lib/db/repo-economy';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, context: Context) {
  try { const user = await requireUser(req); const { id } = await context.params; if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, 'Invalid challenge.'); return Response.json({ submissions: await listChallengeSubmissions(user.id, id) }, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return errorResponse(error instanceof Error && !('status' in error) ? new HttpError(403, error.message) : error); }
}
export async function POST(req: Request, context: Context) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    const { id } = await context.params; const body = await readJsonObject(req);
    const workUrl = typeof body.workUrl === 'string' ? body.workUrl.trim() : '';
    const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
    let url: URL; try { url = new URL(workUrl); } catch { throw new HttpError(400, 'Use a public HTTPS research link.'); }
    if (!/^[0-9a-f-]{36}$/i.test(id) || url.protocol !== 'https:' || workUrl.length > 500 || summary.length < 30 || summary.length > 1000) throw new HttpError(400, 'Use a public HTTPS link and a 30–1000 character summary.');
    const submission = await submitChallenge(user.id, id, workUrl, summary);
    return Response.json({ submission }, { status: 201 });
  } catch (error) { return errorResponse(error instanceof Error && !('status' in error) ? new HttpError(409, error.message) : error); }
}
