import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.PLATFORM_BACKEND_API_URL || process.env.BACKEND_API_URL || '').replace(/\/$/, '');

/**
 * POST /api/platform/auth/login  (proxied through Next.js)
 *
 * This Route Handler replaces the rewrite proxy for login so that
 * Set-Cookie: platform_session can be explicitly forwarded to the browser
 * with the correct attributes for the actual frontend origin.
 */
export async function POST(req: NextRequest) {
  try {
    if (!BACKEND_URL) {
      return NextResponse.json({ message: 'Backend URL not configured' }, { status: 500 });
    }

    const body = await req.json();

    const backendRes = await fetch(`${BACKEND_URL}/api/platform/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { message: data?.message || 'Login failed' },
        { status: backendRes.status }
      );
    }

    const response = NextResponse.json(data, { status: 200 });

    // Extract platform_session from the backend Set-Cookie and re-emit it
    // with correct attributes for this frontend's origin.
    const rawSetCookie = backendRes.headers.get('set-cookie');

    if (rawSetCookie) {
      const cookieEntries = splitSetCookieHeader(rawSetCookie);
      for (const entry of cookieEntries) {
        if (entry.trimStart().startsWith('platform_session=')) {
          const parsed = parseCookieEntry(entry);
          if (parsed) {
            const isProduction = process.env.NODE_ENV === 'production';
            response.cookies.set('platform_session', parsed.value, {
              httpOnly: true,
              secure: isProduction,
              sameSite: 'lax',
              path: '/',
              maxAge: parsed.maxAge ?? 60 * 60 * 24 * 60, // default 60 days
            });
          }
          break;
        }
      }
    } else {
      console.warn('[/api/platform/auth/login] Backend did NOT return a Set-Cookie header');
    }

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/platform/auth/login] Error:', message);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

function splitSetCookieHeader(raw: string): string[] {
  return raw.split(/,\s*(?=[a-zA-Z0-9_\-]+=)/);
}

function parseCookieEntry(entry: string): { value: string; maxAge?: number } | null {
  const parts = entry.split(';').map((p) => p.trim());
  const nameValue = parts[0];
  if (!nameValue) return null;
  const eqIndex = nameValue.indexOf('=');
  if (eqIndex === -1) return null;
  const value = nameValue.slice(eqIndex + 1);
  let maxAge: number | undefined;
  for (const directive of parts.slice(1)) {
    const lower = directive.toLowerCase();
    if (lower.startsWith('max-age=')) {
      const parsed = parseInt(lower.slice('max-age='.length), 10);
      if (!isNaN(parsed)) maxAge = parsed;
    }
  }
  return { value, maxAge };
}
