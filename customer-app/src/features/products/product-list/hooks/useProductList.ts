import { useQuery } from '@tanstack/react-query';
import { productListApi, FilterParams, ProductListResponse } from '../api/productListApi';
import { productListService } from '../services/productListService';
import { useLocationStore } from '@/lib/store/locationStore';

interface UseProductListProps {
  searchQuery?: string;
  filters?: FilterParams | null;
  mode?: 'all' | 'featured' | 'recommended' | 'recently-viewed';
  page?: number;
  limit?: number;
}

export function useProductList({ searchQuery, filters, mode = 'all', page = 1, limit = 10 }: UseProductListProps = {}) {
  const { selectedState, selectedDistrict } = useLocationStore();
  const isSearch = !!searchQuery?.trim();
  const isFilter = !!filters && Object.values(filters).some((val) => val !== undefined && val !== '');

  const queryKey = ['products', { searchQuery, filters, mode, page, limit, selectedState, selectedDistrict }];

  const query = useQuery<ProductListResponse>({
    queryKey,
    queryFn: async (): Promise<ProductListResponse> => {
      if (isSearch) {
        const res = await productListApi.searchProducts(searchQuery!);
        return {
          products: res.products,
          total: res.count || res.products.length,
          totalPages: 1,
          page: 1,
          limit: limit,
        };
      }
      if (isFilter) {
        const res = await productListApi.filterProducts(filters!);
        return {
          products: res.products,
          total: res.count || res.products.length,
          totalPages: 1,
          page: 1,
          limit: limit,
        };
      }
      if (mode === 'featured') {
        const res = await productListApi.getFeaturedProducts(limit);
        return {
          products: res.products,
          total: res.count || res.products.length,
          totalPages: 1,
          page: 1,
          limit: limit,
        };
      }
      if (mode === 'recommended') {
        const res = await productListApi.getRecommendedProducts(limit);
        return {
          products: res.products,
          total: res.count || res.products.length,
          totalPages: 1,
          page: 1,
          limit: limit,
        };
      }
      if (mode === 'recently-viewed') {
        const ids = productListService.getRecentlyViewedIds();
        const res = await productListApi.getRecentlyViewed(ids);
        return {
          products: res.products,
          total: res.count || res.products.length,
          totalPages: 1,
          page: 1,
          limit: limit,
        };
      }
      return productListApi.getProducts({ page, limit });
    },
  });

  const products = query.data?.products || [];
  const total = query.data?.total || 0;
  const totalPages = query.data?.totalPages || 0;

  return {
    products,
    total,
    totalPages,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
