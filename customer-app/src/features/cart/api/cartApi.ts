import axiosInstance from '@/lib/axios/axiosInstance';
import { DetailedProduct } from '../../products/product-details/api/productDetailsApi';

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  createdAt: string;
  product: DetailedProduct;
  variant?: {
    id: string;
    name: string;
    priceDifference: number;
  };
}

export interface CartResponse {
  cart: {
    id: string;
    customerId: string;
    items: CartItem[];
  };
}

export const cartApi = {
  getCart: async (): Promise<CartResponse> => {
    const response = await axiosInstance.get('/api/cart');
    return response.data;
  },
  addToCart: async (productId: string, quantity: number, variantId?: string): Promise<any> => {
    const response = await axiosInstance.post('/api/cart', { productId, quantity, variantId });
    return response.data;
  },
  updateQuantity: async (itemId: string, quantity: number): Promise<any> => {
    const response = await axiosInstance.patch(`/api/cart/${itemId}`, { quantity });
    return response.data;
  },
  removeItem: async (itemId: string): Promise<any> => {
    const response = await axiosInstance.delete(`/api/cart/${itemId}`);
    return response.data;
  },
  clearCart: async (): Promise<any> => {
    const response = await axiosInstance.delete('/api/cart');
    return response.data;
  },
  moveToWishlist: async (itemId: string): Promise<any> => {
    const response = await axiosInstance.post(`/api/cart/${itemId}/move-to-wishlist`);
    return response.data;
  },
};
