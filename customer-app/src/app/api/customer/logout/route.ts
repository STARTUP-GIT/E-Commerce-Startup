import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '');

/**
 * POST /api/customer/logout
 *
 * Clears the customer_session cookie from the browser.
 * Must be a Route Handler — cookies can only be deleted/set in Route Handlers
 * or Server Actions in Next.js App Router.
 */
export async function POST(_req: NextRequest) {
  // Tell the backend to invalidate the session if it tracks them
  try {
    if (BACKEND_URL) {
      await fetch(`${BACKEND_URL}/users/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    }
  } catch (_err) {
    // Non-blocking — we still clear the cookie locally
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const response = NextResponse.json({ message: 'Logged out' }, { status: 200 });

  // Clear by setting maxAge=0
  response.cookies.set('customer_session', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
