import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const GATE_COOKIE = 'dwp_gate';

async function hasValidGateSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(GATE_COOKIE)?.value;
  if (!token) return false;

  const secret = process.env.GATE_SECRET;
  if (!secret) return false;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload.purpose === 'site-gate';
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  // Kill switch: set GATE_ENABLED=false on the server and restart to disable
  // the gate instantly, without a redeploy, if it ever needs to come down fast.
  if (process.env.GATE_ENABLED === 'false') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/access') || pathname.startsWith('/api/gate')) {
    return NextResponse.next();
  }

  const ok = await hasValidGateSession(request);
  if (!ok) {
    const url = request.nextUrl.clone();
    url.pathname = '/access';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)'],
};
