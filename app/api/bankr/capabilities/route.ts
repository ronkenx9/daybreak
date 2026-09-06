import { NextResponse } from 'next/server';
import { getCapabilities } from '@/lib/bankr/capabilities';

// Public capability flags used by the client to gate Bankr UI. No secrets.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(getCapabilities());
}
