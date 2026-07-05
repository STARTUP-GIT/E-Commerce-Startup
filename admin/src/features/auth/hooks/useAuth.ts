import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/store/uiStore';
import { useSession, signIn, signOut } from 'next-auth/react';

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showToast } = useUIStore();
  const { data: session, status, update: updateSession } = useSession();

  // Profile Query: Single source of truth for full active Admin info from backend
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      try {
        const res = await authApi.getProfile();
        return res.admin;
      } catch (err) {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled: status === 'authenticated',
  });

  const login = async (credentials: { email: string; password?: string }) => {
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: credentials.email,
        password: credentials.password,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Refetch profile to validate the backend session
      await queryClient.refetchQueries({ queryKey: ['profile'] });
      const profileData = queryClient.getQueryData(['profile']);

      if (!profileData) {
        throw new Error('Session verification failed: profile endpoint returned unauthorized.');
      }

      showToast('Welcome back, Admin!', 'success');
      router.push('/dashboard');
    } catch (error: any) {
      showToast(error.message || 'Login failed. Please verify credentials.', 'error');
      throw error;
    }
  };

  const loginGoogleMock = async (googlePayload: {
    email: string;
    firstName: string;
    lastName?: string;
    avatarUrl?: string;
    googleId: string;
  }) => {
    try {
      const result = await signIn('credentials', {
        redirect: false,
        isGoogleMock: 'true',
        ...googlePayload,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Refetch profile to validate the backend session
      await queryClient.refetchQueries({ queryKey: ['profile'] });
      const profileData = queryClient.getQueryData(['profile']);

      if (!profileData) {
        throw new Error('Session verification failed: profile endpoint returned unauthorized.');
      }

      showToast('Signed in via Google successfully!', 'success');
      router.push('/dashboard');
    } catch (error: any) {
      showToast(error.message || 'Google mock sign in failed.', 'error');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut({ redirect: false });
      queryClient.setQueryData(['profile'], null);
      queryClient.clear();
      showToast('Logged out successfully.', 'info');
      router.push('/login');
    } catch (error: any) {
      queryClient.setQueryData(['profile'], null);
      queryClient.clear();
      router.push('/login');
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data.admin);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      showToast('Profile updated successfully.', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update profile.', 'error');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      showToast('Password updated successfully.', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to change password.', 'error');
    },
  });

  return {
    admin: profileQuery.data ?? null,
    isAuthenticated: status === 'authenticated' && !!profileQuery.data,
    isLoading: status === 'loading' || (status === 'authenticated' && profileQuery.isLoading),
    isFetching: profileQuery.isFetching,

    login,
    loginGoogleMock,
    isLoggingIn: status === 'loading',
    loginError: null,

    logout,
    isLoggingOut: false,

    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,

    changePassword: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
  };
}
