import { useMutation } from '@tanstack/react-query';
import { signIn } from 'next-auth/react';
import { signupApi } from '../api/signupApi';
import { signupService, SignupInput } from '../services/signupService';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function useSignup() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: SignupInput) => {
      setError(null);
      const validation = signupService.validateInput(data);
      if (!validation.success) {
        throw new Error(validation.error.issues[0].message);
      }

      // 1. Direct registration to get backend session cookie
      const response = await signupApi.register(data);

      // 2. Auto login via NextAuth
      const nextAuthResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (nextAuthResult?.error) {
        throw new Error(nextAuthResult.error);
      }

      return response;
    },
    onSuccess: () => {
      router.push('/');
      router.refresh();
    },
    onError: (err: any) => {
      setError(signupService.formatError(err));
    },
  });

  return {
    signup: mutation.mutate,
    isLoading: mutation.isPending,
    error,
    isSuccess: mutation.isSuccess,
  };
}
