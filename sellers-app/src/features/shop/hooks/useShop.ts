import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '../api/shopApi';
import { useState } from 'react';
import axios from 'axios';

export function useShop() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Shop Info Query
  const shopQuery = useQuery({
    queryKey: ['shop'],
    queryFn: async () => {
      try {
        const res = await shopApi.getShop();
        return res.shop;
      } catch (err: any) {
        // Return null if shop doesn't exist (returns 404)
        return null;
      }
    },
    retry: false,
  });

  // Approval Status Query
  const approvalStatusQuery = useQuery({
    queryKey: ['shop-approval'],
    queryFn: async () => {
      try {
        return await shopApi.getApprovalStatus();
      } catch {
        return null;
      }
    },
    enabled: !!shopQuery.data,
  });

  // Bank Account Query
  const bankQuery = useQuery({
    queryKey: ['bank-account'],
    queryFn: async () => {
      try {
        const res = await shopApi.getBankAccount();
        return res.bankAccount;
      } catch {
        return [];
      }
    },
    enabled: !!shopQuery.data,
  });

  // Mutations
  const createShopMutation = useMutation({
    mutationFn: shopApi.createShop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  const updateBannerMutation = useMutation({
    mutationFn: shopApi.updateBanner,
    onSuccess: (data) => {
      queryClient.setQueryData(['shop'], data.shop);
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  const updateLogoMutation = useMutation({
    mutationFn: shopApi.updateLogo,
    onSuccess: (data) => {
      queryClient.setQueryData(['shop'], data.shop);
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  const addBankAccountMutation = useMutation({
    mutationFn: shopApi.addBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-account'] });
    },
  });

  const updateShopMutation = useMutation({
    mutationFn: shopApi.updateShop,
    onSuccess: (data) => {
      queryClient.setQueryData(['shop'], data.shop);
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  const applyApprovalMutation = useMutation({
    mutationFn: shopApi.applyApproval,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-approval'] });
    },
  });

  const submitBanAppealMutation = useMutation({
    mutationFn: shopApi.submitBanAppeal,
  });

  const deleteShopMutation = useMutation({
    mutationFn: shopApi.deleteShop,
    onSuccess: () => {
      queryClient.setQueryData(['shop'], null);
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  // File Upload Helper (Direct S3 / Storage API)
  const uploadImage = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(10);
    try {
      // 1. Get presigned PUT URL
      // The API endpoint resides on the backend. Since our axiosInstance maps to /api/storage/upload-url via proxy:
      const response = await axiosInstanceUploadUrl(file.name, file.type || 'image/jpeg');
      setUploadProgress(40);

      // 2. Put file to presigned URL
      await axios.put(response.url, file, {
        headers: {
          'Content-Type': file.type || 'image/jpeg',
        },
      });
      setUploadProgress(100);

      // Extract raw URL (remove query parameters)
      return response.url.split('?')[0];
    } catch (error) {
      console.error('Image upload failed:', error);
      throw new Error('Failed to upload image asset');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Internal helper to retrieve presigned url (matching customOrder style)
  const axiosInstanceUploadUrl = async (filename: string, contentType: string) => {
    // Call storage route: app.use('/api/storage', storageRoute)
    // The route maps to POST /api/storage/upload-url
    const response = await axios.post('/api/storage/upload-url', { filename, contentType }, { withCredentials: true });
    return response.data;
  };

  return {
    shop: shopQuery.data ?? null,
    hasShop: !!shopQuery.data,
    isLoadingShop: shopQuery.isLoading,
    isErrorShop: shopQuery.isError,
    refetchShop: shopQuery.refetch,

    approval: approvalStatusQuery.data ?? null,
    isLoadingApproval: approvalStatusQuery.isLoading,

    bankAccounts: bankQuery.data ?? [],
    isLoadingBank: bankQuery.isLoading,

    createShop: createShopMutation.mutateAsync,
    isCreatingShop: createShopMutation.isPending,

    updateShop: updateShopMutation.mutateAsync,
    isUpdatingShop: updateShopMutation.isPending,

    updateBanner: updateBannerMutation.mutateAsync,
    isUpdatingBanner: updateBannerMutation.isPending,

    updateLogo: updateLogoMutation.mutateAsync,
    isUpdatingLogo: updateLogoMutation.isPending,

    addBankAccount: addBankAccountMutation.mutateAsync,
    isAddingBank: addBankAccountMutation.isPending,

    applyApproval: applyApprovalMutation.mutateAsync,
    isApplyingApproval: applyApprovalMutation.isPending,

    submitBanAppeal: submitBanAppealMutation.mutateAsync,
    isSubmittingAppeal: submitBanAppealMutation.isPending,

    deleteShop: deleteShopMutation.mutateAsync,
    isDeletingShop: deleteShopMutation.isPending,

    uploadImage,
    isUploading,
    uploadProgress,
  };
}
