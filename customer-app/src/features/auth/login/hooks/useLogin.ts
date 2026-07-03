import { useMutation } from '@tanstack/react-query';
import { signIn } from 'next-auth/react';
import { loginService, LoginInput } from '../services/loginService';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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

      const nextAuthResult = await signIn('credentials', {
        identifier: data.email,
        password: data.password,
        redirect: false,
      });

      if (nextAuthResult?.error) {
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
