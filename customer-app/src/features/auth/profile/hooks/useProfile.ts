import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, EditProfilePayload, UpdateProfilePayload } from '../api/profileApi';
import { signOut } from 'next-auth/react';

export function useProfile() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.getProfile(),
  });

  const editProfileMutation = useMutation({
    mutationFn: (payload: EditProfilePayload) => profileApi.editProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const addAddressMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => profileApi.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => profileApi.deactivateAccount(),
    onSuccess: () => {
      signOut({ callbackUrl: '/login' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => profileApi.deleteProfile(),
    onSuccess: () => {
      signOut({ callbackUrl: '/login' });
    },
  });

  return {
    profile: profileQuery.data?.user,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,
    refetch: profileQuery.refetch,
    
    editProfile: editProfileMutation.mutate,
    isEditing: editProfileMutation.isPending,
    editError: editProfileMutation.error,

    addAddress: addAddressMutation.mutate,
    isAddingAddress: addAddressMutation.isPending,
    addAddressError: addAddressMutation.error,

    deactivateAccount: deactivateMutation.mutate,
    isDeactivating: deactivateMutation.isPending,

    deleteAccount: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
