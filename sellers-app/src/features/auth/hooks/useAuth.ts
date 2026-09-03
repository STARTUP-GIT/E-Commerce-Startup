import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthBootstrapStore } from '@/lib/store/authBootstrapStore';

function useAuthReady() {
  const [ready, setReady] = useState(false);
  const bootstrapped = useAuthBootstrapStore((s) => s.bootstrapped);

  // The profile GET must not fire before the auth bootstrap completes. The
  // bootstrap is orchestrated in App.tsx: it restores the Supabase session and,
  // for Google users, syncs via POST /seller/api/auth/google which stores the
  // seller_token in localStorage. Firing the profile GET before that stores the
  // token results in a 401 (missing token) and the user is wrongly treated as
  // logged out. Only bootstrapped=true guarantees the token has been written
  // (or that there is definitively no session).
  useEffect(() => {
    if (bootstrapped && !ready) {
      setReady(true);
    }
  }, [bootstrapped, ready]);

  // Reset readiness if a new bootstrap cycle begins (e.g. a sign-in/sign-out).
  useEffect(() => {
    if (!bootstrapped && ready) {
      setReady(false);
    }
  }, [bootstrapped, ready]);

  return ready;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authReady = useAuthReady();

  // Profile Query: Single source of truth for auth state
  const profileQuery = useQuery({
    queryKey: ['profile'],
    enabled: authReady, // Don't fire until the session bootstrap has settled
    queryFn: async () => {
      try {
        const res = await authApi.getProfile();
        return res.user;
      } catch {
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
      if (data.token) {
        localStorage.setItem('seller_token', data.token);
      }
      // Clear all previous queries to avoid cache leaks across logins
      queryClient.clear();
      // Set query data directly and invalidate cache
      queryClient.setQueryData(['profile'], data.user);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Invalidate dashboard and shop queries
      queryClient.invalidateQueries({ queryKey: ['shop'] });
      navigate('/profile');
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem('seller_token', data.token);
      }
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
      navigate('/profile');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem('seller_token');
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Supabase session may already be expired or missing
      }
      try {
        await authApi.logout();
      } catch {
        // Backend session may already be cleared
      }
    },
    onSuccess: () => {
      localStorage.removeItem('seller_token');
      queryClient.setQueryData(['profile'], null);
      queryClient.clear();
      navigate('/login');
    },
    onError: () => {
      localStorage.removeItem('seller_token');
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
    isLoading: !authReady || profileQuery.isLoading,
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
