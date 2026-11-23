import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { cookies } from 'next/headers';
import axios from 'axios';

const setSessionCookies = async (cookieHeader: string[] | string | undefined) => {
  if (!cookieHeader) return;
  const cookieList: string[] = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  for (const cookieStr of cookieList) {
    if (!cookieStr || typeof cookieStr !== 'string') continue;
    const parts = cookieStr.split(';');
    const [nameValue, ...directives] = parts;
    if (!nameValue) continue;
    const eqIdx = nameValue.indexOf('=');
    if (eqIdx === -1) continue;
    const name = nameValue.slice(0, eqIdx).trim();
    const value = nameValue.slice(eqIdx + 1).trim();

    if (name !== 'admin_session' && name !== 'admin_refresh') continue;

    const options: any = {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: name === 'admin_refresh' ? 30 * 24 * 60 * 60 : 60 * 24 * 60 * 60,
    };

    directives.forEach((d) => {
      const trimmed = d.trim().toLowerCase();
      if (trimmed.startsWith('max-age=')) {
        const parsed = parseInt(trimmed.split('=')[1], 10);
        if (!isNaN(parsed)) options.maxAge = parsed;
      } else if (trimmed.startsWith('expires=')) {
        options.expires = new Date(trimmed.split('=')[1]);
      }
    });

    cookieStore.set(name, value, options);
  }
};

const setSessionCookie = setSessionCookies;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        isGoogleMock: { label: 'isGoogleMock', type: 'text' },
        firstName: { label: 'firstName', type: 'text' },
        lastName: { label: 'lastName', type: 'text' },
        avatarUrl: { label: 'avatarUrl', type: 'text' },
        googleId: { label: 'googleId', type: 'text' },
      },
      async authorize(credentials) {
        const backendUrl = (process.env.ADMIN_BACKEND_API_URL || process.env.BACKEND_API_URL || 'http://localhost:3003').replace(/\/$/, '');

        if (credentials?.isGoogleMock === 'true') {
          try {
            const response = await axios.post(`${backendUrl}/api/admin/auth/google`, {
              email: credentials.email,
              firstName: credentials.firstName,
              lastName: credentials.lastName,
              avatarUrl: credentials.avatarUrl,
              googleId: credentials.googleId,
            });

            const data = response.data;
            if (data?.admin) {
              const setCookieHeader = response.headers['set-cookie'];
              await setSessionCookie(setCookieHeader);

              return {
                id: data.admin.id,
                email: data.admin.email,
                name: `${data.admin.firstName} ${data.admin.lastName || ''}`.trim(),
              };
            }
            return null;
          } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Google Auth Failed';
            throw new Error(msg);
          }
        }

        const email = credentials?.email;
        const password = credentials?.password;
        if (!email || !password) return null;

        try {
          const response = await axios.post(`${backendUrl}/api/admin/auth/login`, {
            email,
            password,
          });

          const data = response.data;
          if (data?.admin) {
            const setCookieHeader = response.headers['set-cookie'];
            await setSessionCookie(setCookieHeader);

            return {
              id: data.admin.id,
              email: data.admin.email,
              name: `${data.admin.firstName} ${data.admin.lastName || ''}`.trim(),
            };
          }
          return null;
        } catch (error: any) {
          throw new Error(error.response?.data?.message || error.message || 'Invalid credentials');
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const idToken = account.id_token;
          if (!idToken) return false;

          const backendUrl = (process.env.ADMIN_BACKEND_API_URL || process.env.BACKEND_API_URL || 'http://localhost:3003').replace(/\/$/, '');
          const response = await axios.post(`${backendUrl}/api/admin/auth/google`, {
            idToken,
          });

          const data = response.data;
          if (data?.admin) {
            const setCookieHeader = response.headers['set-cookie'];
            await setSessionCookie(setCookieHeader);

            user.id = data.admin.id;
            user.email = data.admin.email;
            user.name = `${data.admin.firstName} ${data.admin.lastName || ''}`.trim();
            return true;
          }
          return false;
        } catch (error: any) {
          console.error('Admin Google Auth Error:', error);
          const errData = error.response?.data;
          const msg = errData?.message || 'Access denied. Administrator approval required.';
          if (errData?.pendingApproval) {
            return `/login?error=PendingApproval&message=${encodeURIComponent(msg)}`;
          }
          return `/login?error=AccessDenied&message=${encodeURIComponent(msg)}`;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    },
  },
  events: {
    async signOut() {
      try {
        const cookieStore = await cookies();
        cookieStore.delete('admin_session');
        cookieStore.delete('admin_refresh');
        const backendUrl = (process.env.ADMIN_BACKEND_API_URL || process.env.BACKEND_API_URL || 'http://localhost:3003').replace(/\/$/, '');
        await axios.post(`${backendUrl}/api/admin/auth/logout`);
      } catch (error) {
        console.error('Logout error on backend:', error);
      }
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'supersecretnextauthsecret',
};
