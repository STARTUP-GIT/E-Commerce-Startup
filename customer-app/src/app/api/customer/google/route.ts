import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '');

/**
 * POST /api/customer/google
 *
 * Same pattern as /api/customer/login — a Route Handler is the only place
 * in Next.js App Router where cookies can be set on the response.
 * NextAuth's signIn() and authorize() callbacks cannot reliably set cookies.
 *
 * This handler is called by the NextAuth signIn callback for Google OAuth,
 * and also by the CredentialsProvider Google-mock path.
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

    // Call the real backend Google auth endpoint
    const backendRes = await fetch(`${BACKEND_URL}/users/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { message: data?.message || 'Google auth failed' },
        { status: backendRes.status }
      );
    }

    const response = NextResponse.json(data, { status: backendRes.status });

    // Forward customer_session from backend to browser
    const rawSetCookie = backendRes.headers.get('set-cookie');
    if (rawSetCookie) {
      const cookieEntries = splitSetCookieHeader(rawSetCookie);
      for (const entry of cookieEntries) {
        if (entry.trimStart().startsWith('customer_session=')) {
          const parsed = parseCookieEntry(entry);
          if (parsed) {
            const isProduction = process.env.NODE_ENV === 'production';
            response.cookies.set('customer_session', parsed.value, {
              httpOnly: true,
              secure: isProduction,
              sameSite: isProduction ? 'none' : 'lax',
              path: '/',
              maxAge: parsed.maxAge ?? 60 * 60 * 24 * 7,
            });
            console.log('[/api/customer/google] customer_session cookie set on response');
          }
          break;
        }
      }
    } else {
      console.warn('[/api/customer/google] Backend did not return a Set-Cookie header');
    }

    return response;
  } catch (err: any) {
    console.error('[/api/customer/google] Error:', err?.message || err);
    return NextResponse.json(
      { message: 'Internal server error during Google auth' },
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
