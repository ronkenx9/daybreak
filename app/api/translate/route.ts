import { requireUser, readJsonObject, HttpError, errorResponse } from '@/lib/account/auth-server';
import { createKeyedRateLimit, createRequestCache } from '@/lib/server/requests';
import { museRequest } from '@/lib/muse/client';

export const dynamic = 'force-dynamic';
const allowed = createKeyedRateLimit(30, 60_000, 1_000);
const cached = createRequestCache<{ translation: string }>(24 * 60 * 60_000, 1_000, 4);
const languages = { es: 'Spanish', fr: 'French', pt: 'Portuguese', zh: 'Simplified Chinese' } as const;

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!allowed(user.id)) throw new HttpError(429, 'Too many translations. Try again shortly.');
    const body = await readJsonObject(request, 2_000);
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const locale = typeof body.targetLocale === 'string' ? body.targetLocale : '';
    if (!text || text.length > 280) throw new HttpError(400, 'Choose a message of up to 280 characters.');
    if (!Object.hasOwn(languages, locale)) throw new HttpError(400, 'Choose a supported language.');
    const targetLanguage = languages[locale as keyof typeof languages];
    return Response.json(await cached(`${locale}:${text}`, async () => {
      const result = await museRequest(user.id, { action: 'translate', text, targetLocale: locale, targetLanguage });
      const translation = typeof result.data?.translation === 'string' ? result.data.translation.trim().slice(0, 1_200) : '';
      if (!translation) throw new HttpError(502, 'Translation did not return text.');
      return { translation };
    }), { headers: { 'cache-control': 'no-store, private' } });
  } catch (error) { return errorResponse(error); }
}
