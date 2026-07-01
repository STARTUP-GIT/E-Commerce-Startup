import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customOrderApi, CreateCustomOrderPayload } from '../api/customOrderApi';
import { useState } from 'react';

export function useCustomOrders(orderId?: string) {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const customOrdersQuery = useQuery({
    queryKey: ['custom-orders'],
    queryFn: () => customOrderApi.getOrders(),
  });

  const customOrderQuery = useQuery({
    queryKey: ['custom-order-details', orderId],
    queryFn: () => customOrderApi.getOrder(orderId!),
    enabled: !!orderId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCustomOrderPayload) => customOrderApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => customOrderApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['custom-order-details', orderId] });
      }
    },
  });

  const acceptQuoteMutation = useMutation({
    mutationFn: ({ orderId, quoteId }: { orderId: string; quoteId: string }) =>
      customOrderApi.acceptQuote(orderId, quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['custom-order-details', orderId] });
      }
    },
  });

  const rejectQuoteMutation = useMutation({
    mutationFn: ({ orderId, quoteId, reason }: { orderId: string; quoteId: string; reason?: string }) =>
      customOrderApi.rejectQuote(orderId, quoteId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['custom-order-details', orderId] });
      }
    },
  });

  // Direct S3 upload utility helper
  const uploadFile = async (file: File): Promise<{
    fileName: string;
    fileUrl: string;
    fileType: 'STL' | 'STEP' | 'OBJ' | 'PDF' | 'IMAGE' | 'OTHER';
    fileSizeBytes: number;
  }> => {
    setIsUploading(true);
    setUploadProgress(10);
    try {
      // Get presigned URL
      const { url, key } = await customOrderApi.getUploadUrl(file.name, file.type || 'application/octet-stream');
      setUploadProgress(40);
      
      // Upload directly to S3
      await customOrderApi.uploadFileDirectly(url, file, file.type || 'application/octet-stream');
      setUploadProgress(100);

      // Determine file type category
      const ext = file.name.split('.').pop()?.toUpperCase() || '';
      let fileType: 'STL' | 'STEP' | 'OBJ' | 'PDF' | 'IMAGE' | 'OTHER' = 'OTHER';
      
      if (ext === 'STL') fileType = 'STL';
      else if (ext === 'STEP' || ext === 'STP') fileType = 'STEP';
      else if (ext === 'OBJ') fileType = 'OBJ';
      else if (ext === 'PDF') fileType = 'PDF';
      else if (file.type.startsWith('image/') || ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(ext)) {
        fileType = 'IMAGE';
      }

      // Generate public/access URL - since S3 presigned URL key has upload prefix,
      // the base URL is the same host or clean endpoint.
      // S3 URL returned in getUploadUrl contains the path, but standard is URL without the query params
      const fileUrl = url.split('?')[0];

      return {
        fileName: file.name,
        fileUrl: fileUrl,
        fileType,
        fileSizeBytes: file.size,
      };
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error('Failed to upload file attachment');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    customOrders: customOrdersQuery.data?.customOrders || [],
    isCustomOrdersLoading: customOrdersQuery.isLoading,
    isCustomOrdersError: customOrdersQuery.isError,
    refetchOrders: customOrdersQuery.refetch,

    customOrder: customOrderQuery.data?.customOrder,
    isCustomOrderLoading: customOrderQuery.isLoading,
    isCustomOrderError: customOrderQuery.isError,
    refetchOrder: customOrderQuery.refetch,

    createCustomOrder: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    cancelCustomOrder: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,

    acceptQuote: acceptQuoteMutation.mutateAsync,
    isAccepting: acceptQuoteMutation.isPending,

    rejectQuote: rejectQuoteMutation.mutateAsync,
    isRejecting: rejectQuoteMutation.isPending,

    uploadFile,
    isUploading,
    uploadProgress,
  };
}
