import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  profileApi,
  EditProfilePayload,
  UpdateProfilePayload,
  CreateAddressPayload,
  UpdateAddressPayload,
} from '../api/profileApi';
import { signOut, useSession } from 'next-auth/react';

export function useProfile() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.getProfile(),
    enabled: !!session,
  });

  const addressesQuery = useQuery({
    queryKey: ['customer-addresses'],
    queryFn: () => profileApi.getAddresses(),
    enabled: !!session,
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
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
  });

  const createAddressMutation = useMutation({
    mutationFn: (payload: CreateAddressPayload) => profileApi.createAddress(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAddressPayload }) =>
      profileApi.updateAddress(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => profileApi.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: (id: string) => profileApi.setDefaultAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
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

  const addresses = addressesQuery.data?.addresses ?? profileQuery.data?.user?.addresses ?? [];

  return {
    profile: profileQuery.data?.user,
    addresses,
    isLoading: profileQuery.isLoading,
    isLoadingAddresses: addressesQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,
    refetch: profileQuery.refetch,
    refetchAddresses: addressesQuery.refetch,
    
    editProfile: editProfileMutation.mutateAsync,
    isEditing: editProfileMutation.isPending,
    editError: editProfileMutation.error,

    addAddress: addAddressMutation.mutate,
    isAddingAddress: addAddressMutation.isPending,
    addAddressError: addAddressMutation.error,

    createAddress: createAddressMutation.mutateAsync,
    isCreatingAddress: createAddressMutation.isPending,

    updateAddress: updateAddressMutation.mutateAsync,
    isUpdatingAddress: updateAddressMutation.isPending,

    deleteAddress: deleteAddressMutation.mutateAsync,
    isDeletingAddress: deleteAddressMutation.isPending,

    setDefaultAddress: setDefaultAddressMutation.mutateAsync,
    isSettingDefaultAddress: setDefaultAddressMutation.isPending,

    deactivateAccount: deactivateMutation.mutate,
    isDeactivating: deactivateMutation.isPending,

    deleteAccount: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
