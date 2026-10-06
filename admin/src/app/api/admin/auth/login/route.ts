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
  let stage = 'request parsing';
  try {
    if (!BACKEND_URL) {
      return NextResponse.json(
        { message: 'Unable to sign in right now. Please try again later.' },
        { status: 500 }
      );
    }

    const body = await req.json();

    stage = 'backend request';
    const backendRes = await fetch(`${BACKEND_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    stage = 'backend response parsing';
    const responseText = await backendRes.text();
    let data: { message?: unknown; admin?: unknown } | null = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      console.error('[/api/admin/auth/login] Backend returned a non-JSON response', {
        status: backendRes.status,
        contentType: backendRes.headers.get('content-type'),
      });
      return NextResponse.json(
        { message: 'Unable to sign in right now. Please try again later.' },
        { status: backendRes.status >= 500 ? backendRes.status : 502 }
      );
    }

    if (!backendRes.ok) {
      return NextResponse.json(
        { message: getSafeLoginMessage(backendRes.status, data?.message) },
        { status: backendRes.status }
      );
    }

    if (!data?.admin || typeof data.admin !== 'object') {
      console.error('[/api/admin/auth/login] Backend returned an invalid success response');
      return NextResponse.json(
        { message: 'Unable to sign in right now. Please try again later.' },
        { status: 502 }
      );
    }

    const response = NextResponse.json(data, { status: 200 });

    // Re-emit only the HttpOnly session cookies on the Admin frontend origin.
    const rawSetCookie = backendRes.headers.get('set-cookie');
    const forwardedCookies = new Map<string, { value: string; maxAge?: number }>();
    if (rawSetCookie) {
      for (const entry of splitSetCookieHeader(rawSetCookie)) {
        const parsed = parseCookieEntry(entry);
        if (parsed && (parsed.name === 'admin_session' || parsed.name === 'admin_refresh')) {
          forwardedCookies.set(parsed.name, parsed);
        }
      }
    }

    const sessionCookie = forwardedCookies.get('admin_session');
    if (!sessionCookie) {
      console.error('[/api/admin/auth/login] Backend success response did not include an Admin session cookie');
      return NextResponse.json(
        { message: 'Unable to sign in right now. Please try again later.' },
        { status: 502 }
      );
    }

    const isProduction = process.env.NODE_ENV === 'production';
    for (const [name, cookie] of forwardedCookies) {
      response.cookies.set(name, cookie.value, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: cookie.maxAge ?? (name === 'admin_refresh' ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 60),
      });
    }

    return response;
  } catch (error: unknown) {
    if (stage === 'request parsing' && error instanceof SyntaxError) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }
    console.error('[/api/admin/auth/login] Proxy failed', { stage, error });
    return NextResponse.json(
      { message: 'Unable to sign in right now. Please try again later.' },
      { status: 500 }
    );
  }
}

function getSafeLoginMessage(status: number, message: unknown): string {
  const safeMessages = new Set([
    'Email and password are required',
    'Invalid email or password.',
    'Your account is disabled. Please contact an administrator.',
    'Too many requests, please try again later.',
  ]);

  if (typeof message === 'string' && safeMessages.has(message)) {
    return message;
  }
  if (status === 401) {
    return 'Invalid email or password.';
  }
  return 'Unable to sign in right now. Please try again later.';
}

function splitSetCookieHeader(raw: string): string[] {
  return raw.split(/,\s*(?=[a-zA-Z0-9_\-]+=)/);
}

function parseCookieEntry(entry: string): { name: string; value: string; maxAge?: number } | null {
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
  return { name: nameValue.slice(0, eqIndex), value, maxAge };
}
