import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/store/uiStore';
import { useSession, signIn, signOut } from 'next-auth/react';

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showToast } = useUIStore();
  const { data: session, status } = useSession();
  void session;

  const profileQuery = useQuery({
    queryKey: ['platform-profile'],
    queryFn: async () => {
      try {
        const res = await authApi.getProfile();
        return res.user;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled: status === 'authenticated',
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password?: string }) => {
      // Step 1: Call the backend via Next.js proxy. Backend responds with
      //         Set-Cookie: platform_session=... which is forwarded to the browser.
      await authApi.login(credentials);

      // Step 2: Create the NextAuth session.
      const result = await signIn('credentials', {
        redirect: false,
        email: credentials.email,
        password: credentials.password,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      await queryClient.refetchQueries({ queryKey: ['platform-profile'] });
      const profileData = queryClient.getQueryData(['platform-profile']);

      if (!profileData) {
        throw new Error('Session verification failed: profile endpoint returned unauthorized.');
      }

      showToast('Welcome back!', 'success');
      router.push('/dashboard');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Login failed. Please verify credentials.';
      showToast(message, 'error');
    },
  });

  const login = loginMutation.mutateAsync;

  const logout = async () => {
    try {
      await signOut({ redirect: false });
      queryClient.setQueryData(['platform-profile'], null);
      queryClient.clear();
      showToast('Logged out successfully.', 'info');
      router.push('/login');
    } catch {
      queryClient.setQueryData(['platform-profile'], null);
      queryClient.clear();
      router.push('/login');
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['platform-profile'], data.user);
      queryClient.invalidateQueries({ queryKey: ['platform-profile'] });
      showToast('Profile updated successfully.', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update profile.';
      showToast(message, 'error');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      showToast('Password updated successfully.', 'success');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to change password.';
      showToast(message, 'error');
    },
  });

  return {
    user: profileQuery.data ?? null,
    isAuthenticated: status === 'authenticated' && !!profileQuery.data,
    isLoading: status === 'loading' || (status === 'authenticated' && profileQuery.isLoading),
    isFetching: profileQuery.isFetching,

    login,
    isLoggingIn: loginMutation.isPending,
    logout,

    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,

    changePassword: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
  };
}
