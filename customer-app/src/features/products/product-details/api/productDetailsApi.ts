import axiosInstance from '@/lib/axios/axiosInstance';
import { Product } from '../../../shops/shop-details/api/shopDetailsApi';

export interface ProductImage {
  id: string;
  url: string;
  isDefault: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  priceDifference: number;
  stockQuantity: number;
}

export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
}

export interface DetailedProduct extends Product {
  images: ProductImage[];
  variants: ProductVariant[];
  attributes: ProductAttribute[];
  category?: {
    id: string;
    name: string;
  };
  seller?: {
    id: string;
    firstName: string;
    lastName: string;
    shop?: {
      id: string;
      name: string;
      slug: string;
      deliveryMode?: 'PLATFORM' | 'SELF';
    };
  };
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const productDetailsApi = {
  getProduct: async (productId: string): Promise<{ product: DetailedProduct }> => {
    const response = await axiosInstance.get(`/api/products/${productId}`);
    return response.data;
  },
  getProductReviews: async (productId: string): Promise<{ reviews: Review[] }> => {
    const response = await axiosInstance.get(`/api/reviews/product/${productId}`);
    return response.data;
  },
};
