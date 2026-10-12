import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '');

/**
 * POST /api/customer/login
 *
 * This Route Handler is the ONLY place in Next.js App Router that can
 * write a cookie into the browser response. NextAuth's authorize() callback
 * cannot call cookies().set() because the response headers are already locked
 * by the time authorize() runs — any attempt to set cookies there is silently
 * dropped, which is why customer_session never appeared in the browser.
 *
 * Flow:
 *   Browser → POST /api/customer/login
 *     → This handler → POST ${BACKEND}/users/api/auth/login
 *     ← Backend returns { user } + Set-Cookie: customer_session=...
 *   ← This handler re-sets customer_session on the browser response
 *   ← Returns { user } so the client can call signIn('credentials', …) next
 */
export async function POST(req: NextRequest) {
  try {
    if (!BACKEND_URL) {
      return NextResponse.json(
        { message: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { message: 'Identifier and password are required' },
        { status: 400 }
      );
    }

    // Call the real backend login endpoint
    const backendRes = await fetch(`${BACKEND_URL}/users/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
      credentials: 'include',
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { message: data?.message || 'Login failed' },
        { status: backendRes.status }
      );
    }

    // Build our own response so we can attach the customer_session cookie
    const response = NextResponse.json(data, { status: 200 });

    // Extract customer_session and customer_refresh from backend Set-Cookie header and forward
    const rawSetCookie = backendRes.headers.get('set-cookie');
    const isProduction = process.env.NODE_ENV === 'production';
    if (rawSetCookie) {
      const cookieEntries = splitSetCookieHeader(rawSetCookie);
      for (const entry of cookieEntries) {
        if (entry.trimStart().startsWith('customer_session=')) {
          const parsed = parseCookieEntry(entry);
          if (parsed) {
            response.cookies.set('customer_session', parsed.value, {
              httpOnly: true,
              secure: isProduction,
              sameSite: 'lax',
              path: '/',
              maxAge: parsed.maxAge ?? 60 * 60 * 24 * 7,
            });
          }
        } else if (entry.trimStart().startsWith('customer_refresh=')) {
          const parsed = parseCookieEntry(entry);
          if (parsed) {
            response.cookies.set('customer_refresh', parsed.value, {
              httpOnly: true,
              secure: isProduction,
              sameSite: 'lax',
              path: '/',
              maxAge: parsed.maxAge ?? 60 * 60 * 24 * 30,
            });
          }
        }
      }
    }

    if (data.token && !response.cookies.has('customer_session')) {
      response.cookies.set('customer_session', data.token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    if (data.refreshToken && !response.cookies.has('customer_refresh')) {
      response.cookies.set('customer_refresh', data.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (err: any) {
    console.error('[/api/customer/login] Error:', err?.message || err);
    return NextResponse.json(
      { message: 'Internal server error during login' },
      { status: 500 }
    );
  }
}

/**
 * Split a raw Set-Cookie header string into individual cookie strings.
 * Multiple cookies are comma-separated, but cookie values themselves can
 * contain commas (e.g. in Expires dates), so we split carefully.
 */
function splitSetCookieHeader(raw: string): string[] {
  // Simple split that works for the vast majority of real-world cookies.
  // The regex splits on ', ' that is followed by a cookie name= pattern.
  return raw.split(/,\s*(?=[a-zA-Z0-9_\-]+=)/);
}

/**
 * Parse a single Set-Cookie entry (e.g. "customer_session=xyz; Path=/; Max-Age=604800")
 * and return the value and relevant directives.
 */
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
