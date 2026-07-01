import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi, AddReviewPayload, EditReviewPayload } from '../api/reviewApi';

export function useReviews(productId?: string) {
  const queryClient = useQueryClient();

  const reviewsQuery = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: () => reviewApi.getProductReviews(productId!),
    enabled: !!productId,
  });

  const addReviewMutation = useMutation({
    mutationFn: (payload: AddReviewPayload) => reviewApi.addReview(payload),
    onSuccess: () => {
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
        queryClient.invalidateQueries({ queryKey: ['product-details', productId] });
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-details'] });
    },
  });

  const editReviewMutation = useMutation({
    mutationFn: ({ reviewId, payload }: { reviewId: string; payload: EditReviewPayload }) =>
      reviewApi.editReview(reviewId, payload),
    onSuccess: () => {
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
        queryClient.invalidateQueries({ queryKey: ['product-details', productId] });
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-details'] });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: string) => reviewApi.deleteReview(reviewId),
    onSuccess: () => {
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
        queryClient.invalidateQueries({ queryKey: ['product-details', productId] });
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-details'] });
    },
  });

  return {
    reviews: reviewsQuery.data?.reviews || [],
    isReviewsLoading: reviewsQuery.isLoading,
    isReviewsError: reviewsQuery.isError,

    addReview: addReviewMutation.mutateAsync,
    isAddingReview: addReviewMutation.isPending,
    addReviewError: addReviewMutation.error,

    editReview: editReviewMutation.mutateAsync,
    isEditingReview: editReviewMutation.isPending,

    deleteReview: deleteReviewMutation.mutateAsync,
    isDeletingReview: deleteReviewMutation.isPending,
  };
}
