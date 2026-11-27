import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, AdminProfile } from '../api/authApi';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/store/uiStore';
import { useSession, signIn, signOut } from 'next-auth/react';
import axiosInstance from '@/lib/axios/axiosInstance';
import { isAxiosError } from 'axios';

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showToast } = useUIStore();
  const { data: session, status, update: updateSession } = useSession();

  // Profile Query: Single source of truth for full active Admin info from backend
  const profileQuery = useQuery<AdminProfile | null>({
    queryKey: ['profile'],
    queryFn: async (): Promise<AdminProfile | null> => {
      try {
        const res = await authApi.getProfile();
        return res?.admin ?? null;
      } catch (err: any) {
        if (err?.response?.status === 401) {
          return null;
        }
        // 403 is a permission denial, NEVER an expired session. Preserve authenticated profile.
        if (err?.response?.status === 403) {
          const prev = queryClient.getQueryData<AdminProfile>(['profile']);
          if (prev) return prev;
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: status === 'authenticated',
  });

  const login = async (credentials: { email: string; password?: string }) => {
    try {
      // Step 1: Call the backend via Next.js proxy route handler.
      const loginRes = await authApi.login(credentials);

      // Step 2: Create the NextAuth session without duplicating backend login.
      const result = await signIn('credentials', {
        redirect: false,
        isPreAuthenticated: 'true',
        adminId: loginRes.admin.id,
        email: loginRes.admin.email,
        firstName: loginRes.admin.firstName,
        lastName: loginRes.admin.lastName,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Step 3: Fetch profile directly from backend to verify active session
      let profileData: any = null;
      try {
        const profileRes = await authApi.getProfile();
        profileData = profileRes?.admin || loginRes?.admin;
      } catch (profileErr: any) {
        if (loginRes?.admin) {
          profileData = loginRes.admin;
        } else {
          throw new Error('Session verification failed: profile endpoint returned unauthorized.');
        }
      }

      if (!profileData) {
        throw new Error('Session verification failed: profile endpoint returned unauthorized.');
      }

      queryClient.setQueryData(['profile'], profileData);
      if (updateSession) {
        try {
          await updateSession();
        } catch {
          // Ignore session sync error
        }
      }

      showToast('Welcome back, Admin!', 'success');
      router.push('/dashboard');
    } catch (error: unknown) {
      const serverMessage = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      const errorMessage = error instanceof Error ? error.message : undefined;
      showToast(serverMessage || errorMessage || 'Unable to sign in right now. Please try again later.', 'error');
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
      // Step 1: Establish admin_session cookie directly from the browser.
      const googleRes = await axiosInstance.post('/api/admin/auth/google', googlePayload);
      const adminData = googleRes.data?.admin;

      // Step 2: Create the NextAuth session without duplicating backend google login.
      const result = await signIn('credentials', {
        redirect: false,
        isPreAuthenticated: 'true',
        adminId: adminData?.id || googlePayload.googleId,
        ...googlePayload,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Step 3: Fetch profile directly from backend
      let profileData: any = null;
      try {
        const profileRes = await authApi.getProfile();
        profileData = profileRes?.admin || googleRes.data?.admin;
      } catch (profileErr: any) {
        if (googleRes.data?.admin) {
          profileData = googleRes.data.admin;
        } else {
          throw new Error('Session verification failed: profile endpoint returned unauthorized.');
        }
      }

      if (!profileData) {
        throw new Error('Session verification failed: profile endpoint returned unauthorized.');
      }

      queryClient.setQueryData(['profile'], profileData);
      if (updateSession) {
        try {
          await updateSession();
        } catch {
          // Ignore session sync error
        }
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
      try {
        await authApi.logout();
      } catch {
        // Continue with local cleanup even if backend call fails
      }
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
