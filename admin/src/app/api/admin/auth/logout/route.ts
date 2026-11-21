import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.ADMIN_BACKEND_API_URL || process.env.BACKEND_API_URL || '').replace(/\/$/, '');

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    if (BACKEND_URL) {
      try {
        await fetch(`${BACKEND_URL}/api/admin/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieHeader,
          },
        });
      } catch {
        // Continue clearing cookies even if upstream call fails
      }
    }

    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
    const isProduction = process.env.NODE_ENV === 'production';

    response.cookies.set('admin_session', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    response.cookies.set('admin_refresh', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    if (isProduction) {
      response.headers.append('Set-Cookie', 'admin_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=None; Partitioned');
      response.headers.append('Set-Cookie', 'admin_refresh=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=None; Partitioned');
    }

    return response;
  } catch (error: any) {
    console.error('[/api/admin/auth/logout] Logout error', error);
    return NextResponse.json({ message: 'Logged out' }, { status: 200 });
  }
}
