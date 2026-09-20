import { isDbConfigured } from '@/lib/db/client';
import { economyPublicStats } from '@/lib/db/repo-economy';

export const dynamic = 'force-dynamic';
export async function GET() {
  if (!isDbConfigured) return Response.json({ configured: false }, { headers: { 'Cache-Control': 'no-store' } });
  try { return Response.json({ configured: true, ...(await economyPublicStats()) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ configured: false, error: 'Economy data unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
