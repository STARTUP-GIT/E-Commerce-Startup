import axiosInstance from '@/lib/axios/axiosInstance';
import { Product } from '../../../shops/shop-details/api/shopDetailsApi';

export interface ProductListResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  products: Product[];
}

export interface ProductSearchResponse {
  count: number;
  products: Product[];
}

export interface FilterParams {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  shopId?: string;
  rating?: number;
}

export const productListApi = {
  getProducts: async (params?: { page?: number; limit?: number; sortBy?: string; sortOrder?: string }): Promise<ProductListResponse> => {
    const response = await axiosInstance.get('/api/products', { params });
    return response.data;
  },
  searchProducts: async (query: string): Promise<ProductSearchResponse> => {
    const response = await axiosInstance.get('/api/products/search', { params: { q: query } });
    return response.data;
  },
  filterProducts: async (filters: FilterParams): Promise<ProductSearchResponse> => {
    const response = await axiosInstance.get('/api/products/filter', { params: filters });
    return response.data;
  },
  getFeaturedProducts: async (limit = 10): Promise<ProductSearchResponse> => {
    const response = await axiosInstance.get('/api/products/featured', { params: { limit } });
    return response.data;
  },
  getRecommendedProducts: async (limit = 10): Promise<ProductSearchResponse> => {
    const response = await axiosInstance.get('/api/products/recommended', { params: { limit } });
    return response.data;
  },
  getRecentlyViewed: async (ids: string[]): Promise<ProductSearchResponse> => {
    const response = await axiosInstance.get('/api/products/recently-viewed', { params: { ids: ids.join(',') } });
    return response.data;
  },
};
