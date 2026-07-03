import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { cookies } from 'next/headers';
import axiosInstance from '../axios/axiosInstance';

const setSessionCookie = async (cookieHeader: string[] | undefined) => {
  if (!cookieHeader) return;
  const sessionCookieStr = cookieHeader.find((c) => c.startsWith('customer_session='));
  if (!sessionCookieStr) return;

  const parts = sessionCookieStr.split(';');
  const [nameValue, ...directives] = parts;
  const value = nameValue.split('=')[1];

  const options: any = {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
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
  cookieStore.set('customer_session', value, options);
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        isGoogleMock: { label: 'isGoogleMock', type: 'text' },
        email: { label: 'Email', type: 'text' },
        firstName: { label: 'firstName', type: 'text' },
        lastName: { label: 'lastName', type: 'text' },
        avatarUrl: { label: 'avatarUrl', type: 'text' },
        googleId: { label: 'googleId', type: 'text' },
      },
      async authorize(credentials) {
        if (credentials?.isGoogleMock === 'true') {
          try {
            const response = await axiosInstance.post('/api/auth/google', {
              email: credentials.email,
              firstName: credentials.firstName,
              lastName: credentials.lastName,
              avatarUrl: credentials.avatarUrl,
              googleId: credentials.googleId,
            });

            const data = response.data;
            if (data?.user) {
              const setCookieHeader = response.headers['set-cookie'];
              await setSessionCookie(setCookieHeader);

              return {
                id: data.user.id,
                email: data.user.email,
                name: `${data.user.firstName} ${data.user.lastName || ''}`.trim(),
                username: data.user.username,
              };
            }
            return null;
          } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Google Auth Failed';
            throw new Error(msg);
          }
        }

        const identifier = credentials?.identifier;
        if (!identifier || !credentials?.password) return null;
        try {
          const response = await axiosInstance.post('/api/auth/login', {
            identifier,
            password: credentials.password,
          });

          const data = response.data;
          if (data?.user) {
            // Retrieve set-cookie headers from backend response and set on client
            const setCookieHeader = response.headers['set-cookie'];
            await setSessionCookie(setCookieHeader);

            return {
              id: data.user.id,
              email: data.user.email,
              name: `${data.user.firstName} ${data.user.lastName || ''}`.trim(),
              username: data.user.username,
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

          const response = await axiosInstance.post('/api/auth/google', {
            idToken,
          });

          const data = response.data;
          if (data?.user) {
            const setCookieHeader = response.headers['set-cookie'];
            await setSessionCookie(setCookieHeader);

            user.id = data.user.id;
            user.email = data.user.email;
            user.name = `${data.user.firstName} ${data.user.lastName || ''}`.trim();
            return true;
          }
          return false;
        } catch (error: any) {
          console.error('Google Auth Error:', error);
          const msg = error?.message || '';
          if (msg.includes('Seller') || msg.includes('seller')) {
            return '/login?error=SellerAccountExists';
          }
          return '/login?error=GoogleAuthFailed';
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
        cookieStore.delete('customer_session');
        await axiosInstance.post('/api/auth/logout');
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
