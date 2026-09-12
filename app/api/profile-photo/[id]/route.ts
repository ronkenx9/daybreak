import { getProfilePhoto } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return new Response('Not found', { status: 404 });
  const photo = await getProfilePhoto(id).catch(() => null);
  if (!photo) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(photo.data, 'base64'), {
    headers: {
      'Content-Type': photo.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
