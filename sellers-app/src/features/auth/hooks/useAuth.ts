import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Profile Query: Single source of truth for auth state
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      try {
        const res = await authApi.getProfile();
        return res.user;
      } catch (err) {
        // Return null if unauthenticated rather than throwing to avoid error states
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
    retry: false, // Do not retry auth calls
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // Clear all previous queries to avoid cache leaks across logins
      queryClient.clear();
      // Set query data directly and invalidate cache
      queryClient.setQueryData(['profile'], data.user);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Invalidate dashboard and shop queries
      queryClient.invalidateQueries({ queryKey: ['shop'] });
      navigate('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      // Clear all previous queries to avoid cache leaks across registrations
      queryClient.clear();
      // Invalidate profile query to fetch new register profile
      const firstName = data.user.fullname.split(' ')[0] || '';
      const lastName = data.user.fullname.split(' ').slice(1).join(' ') || '';
      queryClient.setQueryData(['profile'], {
        id: data.user.id,
        email: data.user.email,
        firstName,
        lastName,
        username: '',
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigate('/dashboard');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
      return authApi.logout();
    },
    onSuccess: () => {
      // Clear all queries
      queryClient.setQueryData(['profile'], null);
      queryClient.clear();
      navigate('/login');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data.user);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: authApi.deactivateAccount,
    onSuccess: () => {
      queryClient.setQueryData(['profile'], null);
      queryClient.clear();
      navigate('/login');
    },
  });

  return {
    user: profileQuery.data ?? null,
    isAuthenticated: !!profileQuery.data,
    isLoading: profileQuery.isLoading,
    isFetching: profileQuery.isFetching,

    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error as Error | null,

    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error as Error | null,

    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,

    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,

    deactivateAccount: deactivateMutation.mutateAsync,
    isDeactivating: deactivateMutation.isPending,
  };
}
