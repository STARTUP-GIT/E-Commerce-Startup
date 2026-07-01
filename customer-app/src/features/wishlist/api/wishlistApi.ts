import axiosInstance from '@/lib/axios/axiosInstance';
import { DetailedProduct } from '../../products/product-details/api/productDetailsApi';

export interface WishlistItem {
  id: string;
  wishlistId: string;
  productId: string;
  createdAt: string;
  product: DetailedProduct;
}

export interface WishlistResponse {
  wishlist: {
    id: string;
    customerId: string;
    items: WishlistItem[];
  };
}

export const wishlistApi = {
  getWishlist: async (): Promise<WishlistResponse> => {
    const response = await axiosInstance.get('/api/wishlist');
    return response.data;
  },
  addToWishlist: async (productId: string): Promise<any> => {
    const response = await axiosInstance.post('/api/wishlist', { productId });
    return response.data;
  },
  removeFromWishlist: async (itemId: string): Promise<any> => {
    const response = await axiosInstance.delete(`/api/wishlist/${itemId}`);
    return response.data;
  },
  clearWishlist: async (): Promise<any> => {
    const response = await axiosInstance.delete('/api/wishlist');
    return response.data;
  },
};
