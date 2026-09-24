import { errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { isDbConfigured } from '@/lib/db/client';
import { joinImessageWaitlist } from '@/lib/db/repo-imessage-waitlist';
import { maskImessagePhone, normalizeImessagePhone } from '@/lib/imessage/waitlist';
import { createKeyedRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';

const allowJoin = createKeyedRateLimit(5, 10 * 60_000, 5_000);

function requestKey(request: Request) {
  return request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
}

export async function POST(request: Request) {
  try {
    if (!allowJoin(requestKey(request))) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
    const body = await readJsonObject(request, 2_048);
    if (body.company) return Response.json({ joined: true }, { headers: { 'Cache-Control': 'private, no-store' } }); // quiet honeypot response
    if (body.consent !== true) throw new HttpError(400, 'Consent is required to join the iMessage beta.');
    const phone = normalizeImessagePhone(body.phone);
    if (!phone) throw new HttpError(400, 'Enter a valid phone number with its country code.');
    if (!isDbConfigured) throw new HttpError(503, 'The waitlist is temporarily unavailable.');
    const entry = await joinImessageWaitlist(phone);
    return Response.json(
      { joined: true, status: entry.status, phone: maskImessagePhone(phone) },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    const response = errorResponse(error);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
}
