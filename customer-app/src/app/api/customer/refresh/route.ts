import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '');

/**
 * POST /api/customer/refresh
 *
 * Single-flight session refresh handler for Customer App.
 * Reads customer_refresh cookie (or body refreshToken), calls backend /users/api/auth/refresh,
 * and updates customer_session and customer_refresh cookies on the browser response.
 */
export async function POST(req: NextRequest) {
  try {
    if (!BACKEND_URL) {
      return NextResponse.json(
        { message: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    const cookieHeader = req.headers.get('cookie') || '';
    let bodyToken = '';
    try {
      const body = await req.json();
      bodyToken = body.refreshToken || '';
    } catch {
      // Body may be empty if refresh token is exclusively in cookie
    }

    const backendRes = await fetch(`${BACKEND_URL}/users/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({ refreshToken: bodyToken }),
      credentials: 'include',
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      const errorResponse = NextResponse.json(
        { message: data?.message || 'Refresh failed' },
        { status: backendRes.status }
      );

      // Invalidate cookies on refresh failure
      const isProduction = process.env.NODE_ENV === 'production';
      errorResponse.cookies.set('customer_session', '', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
      errorResponse.cookies.set('customer_refresh', '', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });

      return errorResponse;
    }

    const response = NextResponse.json(data, { status: 200 });
    const isProduction = process.env.NODE_ENV === 'production';

    // Forward Set-Cookie headers from backend if present
    const rawSetCookie = backendRes.headers.get('set-cookie');
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

    // Also fallback to setting from data.token and data.refreshToken directly
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
    console.error('[/api/customer/refresh] Error:', err?.message || err);
    return NextResponse.json(
      { message: 'Internal server error during session refresh' },
      { status: 500 }
    );
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
