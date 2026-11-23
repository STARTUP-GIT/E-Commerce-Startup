import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.ADMIN_BACKEND_API_URL || process.env.BACKEND_API_URL || '').replace(/\/$/, '');

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

export async function POST(req: NextRequest) {
  try {
    if (!BACKEND_URL) {
      return NextResponse.json(
        { message: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    const cookieHeader = req.headers.get('cookie') || '';
    const backendRes = await fetch(`${BACKEND_URL}/api/admin/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookieHeader,
      },
    });

    const responseText = await backendRes.text();
    let data: any = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      return NextResponse.json(
        { message: 'Invalid response from backend' },
        { status: backendRes.status >= 500 ? backendRes.status : 502 }
      );
    }

    if (!backendRes.ok) {
      return NextResponse.json(
        data || { message: 'Refresh failed' },
        { status: backendRes.status }
      );
    }

    const response = NextResponse.json(data || { message: 'Refreshed' }, { status: 200 });

    const rawSetCookie = backendRes.headers.get('set-cookie');
    const cookieEntries: string[] = typeof (backendRes.headers as any).getSetCookie === 'function'
      ? (backendRes.headers as any).getSetCookie()
      : (rawSetCookie ? splitSetCookieHeader(rawSetCookie) : []);
    const entriesToProcess = cookieEntries.length > 0 ? cookieEntries : (rawSetCookie ? splitSetCookieHeader(rawSetCookie) : []);
    const isProduction = process.env.NODE_ENV === 'production';

    for (const entry of entriesToProcess) {
      const parsed = parseCookieEntry(entry);
      if (parsed && (parsed.name === 'admin_session' || parsed.name === 'admin_refresh')) {
        response.cookies.set(parsed.name, parsed.value, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          path: '/',
          maxAge: parsed.maxAge ?? (parsed.name === 'admin_refresh' ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 60),
        });
      }
    }

    return response;
  } catch (error: any) {
    console.error('[/api/admin/auth/refresh] Proxy failed', error);
    return NextResponse.json(
      { message: 'Refresh error' },
      { status: 500 }
    );
  }
}
