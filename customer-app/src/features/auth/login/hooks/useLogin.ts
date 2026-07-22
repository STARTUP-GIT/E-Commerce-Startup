import { useMutation } from '@tanstack/react-query';
import { signIn } from 'next-auth/react';
import { loginService, LoginInput } from '../services/loginService';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Two-step login flow:
 *
 * Step 1 — POST /api/customer/login  (our Route Handler)
 *   This sets the `customer_session` HttpOnly cookie on the browser.
 *   Route Handlers are the only place in Next.js App Router where
 *   cookies can be written to the response.
 *
 * Step 2 — signIn('credentials', { redirect: false })  (NextAuth)
 *   This issues the NextAuth JWT (__Secure-next-auth.session-token)
 *   so that useSession() / middleware auth guards work.
 *
 * After both steps the browser has:
 *   ✅ customer_session       → sent to backend on every authenticated request
 *   ✅ next-auth.session-token → used by Next.js middleware / useSession()
 */
export function useLogin() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      setError(null);

      const validation = loginService.validateInput(data);
      if (!validation.success) {
        throw new Error(validation.error.issues[0].message);
      }

      // ── Step 1: Set customer_session cookie via Route Handler ──────────────
      const loginRes = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // credentials: 'include' ensures the browser accepts the Set-Cookie
        credentials: 'include',
        body: JSON.stringify({
          identifier: data.email,
          password: data.password,
        }),
      });

      if (!loginRes.ok) {
        const errData = await loginRes.json().catch(() => ({}));
        throw new Error(errData?.message || 'Login failed');
      }

      // ── Step 2: Issue NextAuth JWT (session token) ─────────────────────────
      const nextAuthResult = await signIn('credentials', {
        identifier: data.email,
        password: data.password,
        redirect: false,
      });

      if (nextAuthResult?.error) {
        // nextAuthResult.error contains the message thrown inside authorize()
        throw new Error(nextAuthResult.error);
      }

      return nextAuthResult;
    },
    onSuccess: () => {
      router.push('/');
      router.refresh();
    },
    onError: (err: any) => {
      setError(loginService.formatError(err));
    },
  });

  return {
    login: mutation.mutate,
    isLoading: mutation.isPending,
    error,
    isSuccess: mutation.isSuccess,
  };
}
