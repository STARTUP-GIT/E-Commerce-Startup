import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customOrderApi, CreateCustomOrderPayload } from '../api/customOrderApi';
import { useFileUpload } from '../../storage/hooks/useFileUpload';
import { useState } from 'react';

export function useCustomOrders(orderId?: string) {
  const queryClient = useQueryClient();

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

  const { upload: uploadToStorage, isUploading, progress: uploadProgress } = useFileUpload({
    folder: 'products',
    maxSizeMB: 25,
    allowedTypes: [
      'application/pdf', 
      'application/octet-stream', 
      'image/jpeg', 
      'image/png', 
      'image/webp',
      'model/stl',
      'model/step',
      'model/obj'
    ]
  });

  const uploadFile = async (file: File) => {
    const result = await uploadToStorage(file);
    if (!result) throw new Error('File upload failed');

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

    return {
      fileName: file.name,
      fileUrl: result.url,
      fileType,
      fileSizeBytes: file.size,
    };
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
