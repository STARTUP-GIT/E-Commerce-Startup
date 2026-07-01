import { useQuery } from '@tanstack/react-query';
import { shopDetailsApi } from '../api/shopDetailsApi';

interface UseShopDetailsProps {
  shopId: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export function useShopDetails({ shopId, page = 1, limit = 10, sortBy, sortOrder }: UseShopDetailsProps) {
  const detailsQuery = useQuery({
    queryKey: ['shop-details', shopId],
    queryFn: () => shopDetailsApi.getDetails(shopId),
    enabled: !!shopId,
  });

  const categoriesQuery = useQuery({
    queryKey: ['shop-categories', shopId],
    queryFn: () => shopDetailsApi.getCategories(shopId),
    enabled: !!shopId,
  });

  const productsQuery = useQuery({
    queryKey: ['shop-products', shopId, { page, limit, sortBy, sortOrder }],
    queryFn: () => shopDetailsApi.getProducts(shopId, { page, limit, sortBy, sortOrder }),
    enabled: !!shopId,
  });

  return {
    shop: detailsQuery.data?.shop,
    categories: categoriesQuery.data?.categories || [],
    products: productsQuery.data?.products || [],
    pagination: {
      page: productsQuery.data?.page || 1,
      limit: productsQuery.data?.limit || 10,
      total: productsQuery.data?.total || 0,
      totalPages: productsQuery.data?.totalPages || 0,
    },
    isLoading: detailsQuery.isLoading || categoriesQuery.isLoading || productsQuery.isLoading,
    isError: detailsQuery.isError || categoriesQuery.isError || productsQuery.isError,
    error: detailsQuery.error || categoriesQuery.error || productsQuery.error,
  };
}
