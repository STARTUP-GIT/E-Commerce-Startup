import { useQuery } from '@tanstack/react-query';
import { productDetailsApi } from '../api/productDetailsApi';
import { useEffect } from 'react';
import { productListService } from '../../product-list/services/productListService';

export function useProductDetails(productId: string) {
  const detailsQuery = useQuery({
    queryKey: ['product-details', productId],
    queryFn: () => productDetailsApi.getProduct(productId),
    enabled: !!productId,
  });

  const reviewsQuery = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: () => productDetailsApi.getProductReviews(productId),
    enabled: !!productId,
  });

  useEffect(() => {
    if (productId && detailsQuery.data?.product) {
      productListService.addRecentlyViewedId(productId);
    }
  }, [productId, detailsQuery.data]);

  return {
    product: detailsQuery.data?.product,
    reviews: reviewsQuery.data?.reviews || [],
    isLoading: detailsQuery.isLoading || reviewsQuery.isLoading,
    isError: detailsQuery.isError || reviewsQuery.isError,
    error: detailsQuery.error || reviewsQuery.error,
  };
}
