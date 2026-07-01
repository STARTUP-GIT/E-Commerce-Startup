import axiosInstance from '@/lib/axios/axiosInstance';
import { API_ROUTES } from '@/lib/config/api';

export interface Shop {
  id: string;
  sellerId: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  businessName?: string;
  supportEmail?: string;
  supportPhone?: string;
  createdAt: string;
  distance?: number;
  defaultPickupAddress?: {
    id: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface ShopListResponse {
  count: number;
  shops: Shop[];
}

export const shopListApi = {
  getFeaturedShops: async (limit = 10, state?: string, district?: string): Promise<ShopListResponse> => {
    const response = await axiosInstance.get(API_ROUTES.shops.featured, {
      params: { limit, state, district },
    });
    return response.data;
  },

  getNearbyShops: async (
    lat: number,
    lng: number,
    radius?: number,
    state?: string,
    district?: string
  ): Promise<ShopListResponse> => {
    const response = await axiosInstance.get(API_ROUTES.shops.nearby, {
      params: { lat, lng, radius, state, district },
    });
    return response.data;
  },

  searchShops: async (query: string, state?: string, district?: string): Promise<ShopListResponse> => {
    const response = await axiosInstance.get(API_ROUTES.shops.search, {
      params: { q: query, state, district },
    });
    return response.data;
  },
};
