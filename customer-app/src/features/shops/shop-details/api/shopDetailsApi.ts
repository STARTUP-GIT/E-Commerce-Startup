import axiosInstance from '@/lib/axios/axiosInstance';
import { Shop } from '../../shop-list/api/shopListApi';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  stockQuantity: number;
  sellerId: string;
  categoryId: string;
  fulfilmentType?: 'READY_TO_SHIP' | 'MADE_TO_ORDER';
  minPrepDays?: number | null;
  maxPrepDays?: number | null;
  prepTimeType?: 'CALENDAR_DAYS' | 'BUSINESS_DAYS' | null;
  productionNotes?: string | null;
  maxConcurrentOrders?: number | null;
  activeProductionOrders?: number;
  createdAt: string;
}

export interface ShopProductsResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  products: Product[];
}

export const shopDetailsApi = {
  getDetails: async (shopIdOrSlug: string): Promise<{ shop: Shop }> => {
    const response = await axiosInstance.get(`/api/shops/${shopIdOrSlug}`);
    return response.data;
  },
  getCategories: async (shopIdOrSlug: string): Promise<{ count: number; categories: Category[] }> => {
    const response = await axiosInstance.get(`/api/shops/${shopIdOrSlug}/categories`);
    return response.data;
  },
  getProducts: async (
    shopIdOrSlug: string,
    params?: { page?: number; limit?: number; sortBy?: string; sortOrder?: string }
  ): Promise<ShopProductsResponse> => {
    const response = await axiosInstance.get(`/api/shops/${shopIdOrSlug}/products`, { params });
    return response.data;
  },
};
