import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/store/uiStore';

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showToast } = useUIStore();

  const { data: setupData } = useQuery({
    queryKey: ['setup-status'],
    queryFn: authApi.getSetupStatus,
    staleTime: Infinity,
  });

  // Profile Query: Single source of truth for auth state
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      try {
        const res = await authApi.getProfile();
        return res.admin;
      } catch (err) {
        // Return null if unauthenticated rather than throwing to avoid error states
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
    retry: false, // Do not retry auth calls
    enabled: setupData?.initialized === true,
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // Set query data directly and invalidate cache
      queryClient.setQueryData(['profile'], data.admin);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      showToast('Welcome back, Admin!', 'success');
      router.push('/dashboard');
    },
    onError: (error: any) => {
      showToast(error.message || 'Login failed. Please verify credentials.', 'error');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear all queries
      queryClient.setQueryData(['profile'], null);
      queryClient.clear();
      showToast('Logged out successfully.', 'info');
      router.push('/login');
    },
    onError: (error: any) => {
      // Direct redirect if backend logout fails but local session cleared
      queryClient.setQueryData(['profile'], null);
      queryClient.clear();
      router.push('/login');
    },
  });

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
    isAuthenticated: !!profileQuery.data,
    isLoading: profileQuery.isLoading,
    isFetching: profileQuery.isFetching,

    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error as Error | null,

    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,

    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,

    changePassword: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
  };
}
