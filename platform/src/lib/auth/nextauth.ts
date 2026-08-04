import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { cookies } from 'next/headers';
import axios from 'axios';

const setSessionCookie = async (cookieHeader: string[] | undefined) => {
  if (!cookieHeader) return;
  const sessionCookieStr = cookieHeader.find((c) => c.startsWith('platform_session='));
  if (!sessionCookieStr) return;

  const parts = sessionCookieStr.split(';');
  const [nameValue, ...directives] = parts;
  const value = nameValue.split('=')[1];

  const options: {
    path: string;
    httpOnly: boolean;
    sameSite: 'lax';
    secure: boolean;
    maxAge?: number;
    expires?: Date;
  } = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  };

  directives.forEach((d) => {
    const trimmed = d.trim().toLowerCase();
    if (trimmed.startsWith('max-age=')) {
      options.maxAge = parseInt(trimmed.split('=')[1], 10);
    } else if (trimmed.startsWith('expires=')) {
      options.expires = new Date(trimmed.split('=')[1]);
    }
  });

  const cookieStore = await cookies();
  cookieStore.set('platform_session', value, options);
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const backendUrl = (process.env.PLATFORM_BACKEND_API_URL || process.env.BACKEND_API_URL || 'http://localhost:3006').replace(/\/$/, '');

        const email = credentials?.email;
        const password = credentials?.password;
        if (!email || !password) return null;

        try {
          const response = await axios.post(`${backendUrl}/api/platform/auth/login`, {
            email,
            password,
          });

          const data = response.data;
          if (data?.user) {
            const setCookieHeader = response.headers['set-cookie'];
            await setSessionCookie(setCookieHeader);

            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name || data.user.email,
              role: data.user.role?.name || 'PLATFORM_USER',
            };
          }
          return null;
        } catch (error: unknown) {
          const message =
            (typeof error === 'object' && error !== null && 'response' in error
              ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
              : undefined) ??
            (error instanceof Error ? error.message : undefined) ??
            'Invalid credentials';
          throw new Error(message);
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const { id, role } = token as { id?: string; role?: string };
        (session.user as { id?: string }).id = id;
        session.user.email = token.email;
        session.user.name = token.name;
        (session.user as { role?: string }).role = role;
      }
      return session;
    },
  },
  events: {
    async signOut() {
      try {
        const cookieStore = await cookies();
        cookieStore.delete('platform_session');
        const backendUrl = (process.env.PLATFORM_BACKEND_API_URL || process.env.BACKEND_API_URL || 'http://localhost:3006').replace(/\/$/, '');
        await axios.post(`${backendUrl}/api/platform/auth/logout`);
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
  secret: process.env.NEXTAUTH_SECRET || 'supersecretplatformnextauthsecret',
};
