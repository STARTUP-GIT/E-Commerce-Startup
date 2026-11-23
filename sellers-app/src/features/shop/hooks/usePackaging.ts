import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi, type PackagingOption } from '../api/shopApi';

export function usePackaging() {
  const queryClient = useQueryClient();

  const packagingQuery = useQuery({
    queryKey: ['seller-packaging-options'],
    queryFn: async () => {
      const res = await shopApi.getPackagingOptions();
      return res.packagingOptions;
    },
    staleTime: 10 * 1000
  });

  const createPackagingMutation = useMutation({
    mutationFn: (payload: Partial<PackagingOption>) => shopApi.createPackagingOption(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-packaging-options'] });
    }
  });

  const updatePackagingMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PackagingOption> }) =>
      shopApi.updatePackagingOption(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-packaging-options'] });
    }
  });

  const togglePackagingMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive?: boolean }) =>
      shopApi.togglePackagingOption(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-packaging-options'] });
    }
  });

  const deletePackagingMutation = useMutation({
    mutationFn: (id: string) => shopApi.deletePackagingOption(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-packaging-options'] });
    }
  });

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => shopApi.uploadPackagingImage(file)
  });

  return {
    packagingOptions: packagingQuery.data ?? [],
    isLoading: packagingQuery.isLoading,
    isFetching: packagingQuery.isFetching,
    refetch: packagingQuery.refetch,
    createPackaging: createPackagingMutation.mutateAsync,
    isCreating: createPackagingMutation.isPending,
    updatePackaging: updatePackagingMutation.mutateAsync,
    isUpdating: updatePackagingMutation.isPending,
    togglePackaging: togglePackagingMutation.mutateAsync,
    isToggling: togglePackagingMutation.isPending,
    deletePackaging: deletePackagingMutation.mutateAsync,
    isDeleting: deletePackagingMutation.isPending,
    uploadImage: uploadImageMutation.mutateAsync,
    isUploading: uploadImageMutation.isPending
  };
}
