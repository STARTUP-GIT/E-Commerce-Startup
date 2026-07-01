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
    if (isPublicRoute(nextUrl.pathname)) {
      return NextResponse.next();
    }

    // Protected: cart, checkout, orders, profile, notifications, wishlist
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
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
