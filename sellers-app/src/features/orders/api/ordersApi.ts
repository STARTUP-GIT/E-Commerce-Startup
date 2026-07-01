import axiosInstance from '@/lib/axios/axiosInstance';

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    imageUrl?: string;
  };
}

export interface SellerOrder {
  id: string;
  orderId: string;
  sellerId: string;
  status: 'PENDING' | 'ACCEPTED' | 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  totalPrice: number;
  createdAt: string;
  acceptedAt?: string;
  packedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  readyByAt?: string;
  rejectionReason?: string;
  order: {
    orderNumber: string;
    shippingAddress: any;
    customerEmail?: string;
    customerPhone?: string;
  };
  items: OrderItem[];
  packingProof?: {
    id: string;
    imageUrls: string[];
    notes?: string;
  };
  delivery?: any;
  timelineEvents?: any[];
}

export const ordersApi = {
  getOrders: async (): Promise<{ count: number; orders: SellerOrder[] }> => {
    const response = await axiosInstance.get('/seller/api/orders');
    return response.data;
  },

  getOrder: async (orderId: string): Promise<{ order: SellerOrder }> => {
    const response = await axiosInstance.get(`/seller/api/orders/${orderId}`);
    return response.data;
  },

  acceptOrder: async (orderId: string): Promise<{ message: string; order: SellerOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/accept`);
    return response.data;
  },

  rejectOrder: async (orderId: string, reason: string): Promise<{ message: string; order: SellerOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/reject`, { reason });
    return response.data;
  },

  setReadyTime: async (orderId: string, readyByAt: string): Promise<{ message: string; order: SellerOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/ready-time`, { readyByAt });
    return response.data;
  },

  uploadPackingProof: async (
    orderId: string,
    imageUrls: string[],
    notes?: string
  ): Promise<{ message: string; packingProof: any }> => {
    const response = await axiosInstance.post(`/seller/api/orders/${orderId}/packing-proof`, {
      imageUrls,
      notes,
    });
    return response.data;
  },

  markPacked: async (orderId: string): Promise<{ message: string; order: SellerOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/packed`);
    return response.data;
  },

  markShipped: async (orderId: string): Promise<{ message: string; order: SellerOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/shipped`);
    return response.data;
  },

  markDelivered: async (orderId: string): Promise<{ message: string; order: SellerOrder }> => {
    const response = await axiosInstance.patch(`/seller/api/orders/${orderId}/delivered`);
    return response.data;
  },

  getOrderTimeline: async (orderId: string): Promise<{ count: number; timeline: any[] }> => {
    const response = await axiosInstance.get(`/seller/api/orders/${orderId}/timeline`);
    return response.data;
  },
};
