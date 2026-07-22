import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.ADMIN_BACKEND_API_URL || process.env.BACKEND_API_URL || '').replace(/\/$/, '');

/**
 * POST /api/admin/auth/login  (proxied through Next.js)
 *
 * This Route Handler replaces the rewrite proxy for login so that
 * Set-Cookie: admin_session can be explicitly forwarded to the browser.
 *
 * Background: Next.js rewrites DO forward Set-Cookie headers, but in some
 * deployment environments (Vercel + cross-origin Render backend) the cookie
 * attributes (SameSite, Secure, Domain) from the upstream response may cause
 * the browser to reject the cookie.  By handling the login explicitly here
 * we can re-emit the cookie with the correct attributes for the actual
 * frontend origin.
 */
export async function POST(req: NextRequest) {
  try {
    if (!BACKEND_URL) {
      return NextResponse.json({ message: 'Backend URL not configured' }, { status: 500 });
    }

    const body = await req.json();

    const backendRes = await fetch(`${BACKEND_URL}/api/admin/auth/login`, {
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

    // Extract admin_session from the backend Set-Cookie and re-emit it
    // with correct attributes for this frontend's origin.
    const rawSetCookie = backendRes.headers.get('set-cookie');
    console.log('[/api/admin/auth/login] backend Set-Cookie header:', rawSetCookie);

    if (rawSetCookie) {
      const cookieEntries = splitSetCookieHeader(rawSetCookie);
      for (const entry of cookieEntries) {
        if (entry.trimStart().startsWith('admin_session=')) {
          const parsed = parseCookieEntry(entry);
          if (parsed) {
            const isProduction = process.env.NODE_ENV === 'production';
            response.cookies.set('admin_session', parsed.value, {
              httpOnly: true,
              secure: isProduction,
              sameSite: isProduction ? 'none' : 'lax',
              path: '/',
              maxAge: parsed.maxAge ?? 60 * 60 * 24 * 60, // default 60 days
            });
            console.log('[/api/admin/auth/login] admin_session cookie set on response ✓');
          }
          break;
        }
      }
    } else {
      console.warn('[/api/admin/auth/login] Backend did NOT return a Set-Cookie header');
    }

    return response;
  } catch (err: any) {
    console.error('[/api/admin/auth/login] Error:', err?.message || err);
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
