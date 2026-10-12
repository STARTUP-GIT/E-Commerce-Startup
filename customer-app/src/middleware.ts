import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

/**
 * Public routes — anyone can visit without logging in
 * Protected routes — redirects to /login if not authenticated
 */
const PUBLIC_ROUTES = [
  '/',
  '/shops',
  '/products',
  '/categories',
  '/login',
  '/signup',
  '/forgot-password',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

export default withAuth(
  function middleware(req) {
    const { nextUrl, nextauth } = req;
    const isAuthenticated = !!nextauth.token;
    const isAuthPage =
      nextUrl.pathname.startsWith('/login') ||
      nextUrl.pathname.startsWith('/signup') ||
      nextUrl.pathname.startsWith('/forgot-password');

    // Redirect logged-in users away from auth pages
    if (isAuthPage && isAuthenticated) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Allow public routes without auth
    let response = NextResponse.next();

    // Synchronize session cookies to browser if user is authenticated via NextAuth
    // but customer_session cookie has not yet been set (e.g. immediately following Google OAuth)
    if (nextauth?.token?.backendToken && !req.cookies.has('customer_session')) {
      const isProduction = process.env.NODE_ENV === 'production';
      response.cookies.set('customer_session', nextauth.token.backendToken as string, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      if (nextauth.token?.backendRefreshToken && !req.cookies.has('customer_refresh')) {
        response.cookies.set('customer_refresh', nextauth.token.backendRefreshToken as string, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60,
        });
      }
    }

    if (isPublicRoute(nextUrl.pathname)) {
      return response;
    }

    // Protected: cart, checkout, orders, profile, notifications, wishlist
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  },
  {
    callbacks: {
      // Always let the middleware function above decide
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
