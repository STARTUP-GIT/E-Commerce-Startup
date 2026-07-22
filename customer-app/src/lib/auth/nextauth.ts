import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

/**
 * WHY WE DO NOT CALL cookies().set() HERE
 * ─────────────────────────────────────────────────────────────────────────────
 * Next.js App Router only allows cookies().set() inside:
 *   - Route Handlers  (app/api/.../route.ts)
 *   - Server Actions  ('use server' functions)
 *
 * NextAuth's authorize() and signIn() callbacks are neither. Calling
 * cookies().set() there is silently dropped — Next.js has already locked the
 * response headers by the time these callbacks run.
 *
 * THE CORRECT PATTERN:
 *   1. The client calls /api/customer/login (our Route Handler).
 *   2. That handler calls the backend, reads Set-Cookie, and sets
 *      customer_session on the browser response (this WORKS).
 *   3. The client then calls signIn('credentials', …) to get the NextAuth
 *      JWT session token (__Secure-next-auth.session-token).
 *
 * authorize() here only validates credentials via the backend to decide
 * whether NextAuth should issue its own JWT — it does NOT set any cookies.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '');

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        // Google mock path — used by the client after calling /api/customer/google
        isGoogleMock: { label: 'isGoogleMock', type: 'text' },
        email:        { label: 'Email',       type: 'text' },
        name:         { label: 'Name',        type: 'text' },
        avatarUrl:    { label: 'avatarUrl',   type: 'text' },
        userId:       { label: 'userId',      type: 'text' },
      },
      async authorize(credentials) {
        // ── Google mock path ──────────────────────────────────────────────────
        // The client already called /api/customer/google (Route Handler) which
        // set customer_session. Here we just create the NextAuth JWT token.
        if (credentials?.isGoogleMock === 'true') {
          if (!credentials.email || !credentials.userId) return null;
          return {
            id:    credentials.userId,
            email: credentials.email,
            name:  credentials.name  || '',
          };
        }

        // ── Credentials path ──────────────────────────────────────────────────
        // The client already called /api/customer/login (Route Handler) which
        // set customer_session. Here we re-validate with the backend just to
        // confirm the credentials are correct before NextAuth issues its JWT.
        const identifier = credentials?.identifier;
        if (!identifier || !credentials?.password) return null;

        try {
          if (!BACKEND_URL) throw new Error('BACKEND_API_URL not configured');

          const res = await fetch(`${BACKEND_URL}/users/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier,
              password: credentials.password,
            }),
          });

          const data = await res.json();

          if (!res.ok || !data?.user) {
            throw new Error(data?.message || 'Invalid credentials');
          }

          // Return user object → NextAuth puts this in the JWT token
          return {
            id:    data.user.id,
            email: data.user.email,
            name:  `${data.user.firstName} ${data.user.lastName || ''}`.trim(),
          };
        } catch (err: any) {
          throw new Error(err?.message || 'Login failed');
        }
      },
    }),

    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID     as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Google OAuth path: the browser already has customer_session set by
      // /api/customer/google (Route Handler). Here we just update the user
      // object so NextAuth can issue its own JWT.
      if (account?.provider === 'google') {
        try {
          const idToken = account.id_token;
          if (!idToken || !BACKEND_URL) return false;

          const res = await fetch(`${BACKEND_URL}/users/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });

          const data = await res.json();

          if (!res.ok || !data?.user) return false;

          // Patch user object so jwt() callback gets the right values
          user.id    = data.user.id;
          user.email = data.user.email;
          user.name  = `${data.user.firstName} ${data.user.lastName || ''}`.trim();
          return true;
        } catch (err: any) {
          console.error('[NextAuth] Google signIn error:', err?.message);
          const msg = err?.message || '';
          if (msg.toLowerCase().includes('seller')) {
            return '/login?error=SellerAccountExists';
          }
          return '/login?error=GoogleAuthFailed';
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id    = user.id;
        token.email = user.email;
        token.name  = user.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        session.user.email       = token.email;
        session.user.name        = token.name;
      }
      return session;
    },
  },

  events: {
    async signOut() {
      // Call backend logout to clear server-side session if any.
      // customer_session cookie clearing is handled by /api/customer/logout
      // (to be called by the client on sign-out).
      try {
        if (BACKEND_URL) {
          await fetch(`${BACKEND_URL}/users/api/auth/logout`, { method: 'POST' });
        }
      } catch (err) {
        console.error('[NextAuth] Logout error:', err);
      }
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: {
    strategy: 'jwt',
  },

  secret: process.env.NEXTAUTH_SECRET || 'supersecretnextauthsecret',
};
