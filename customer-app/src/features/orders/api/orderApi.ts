import axiosInstance from '@/lib/axios/axiosInstance';

export interface OrderItem {
  id: string;
  productId: string;
  productVariantId?: string;
  productName: string;
  productSku: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SellerOrder {
  id: string;
  sellerId: string;
  status: string;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  packingFee: number;
  deliveryMode?: 'PLATFORM' | 'SELF';
  selectedDeliveryMethod?: string;
  deliveryAssignedAt?: string;
  items: OrderItem[];
  seller?: {
    id: string;
    firstName: string;
    lastName: string;
    shop?: {
      name: string;
      slug: string;
    };
  };
}

export interface OrderTimelineEvent {
  id: string;
  entityType: string;
  status: string;
  title: string;
  description?: string;
  occurredAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  discountTotal: number;
  packingFeeTotal: number;
  platformFeeTotal: number;
  grandTotal: number;
  placedAt: string;
  sellerOrders: SellerOrder[];
  timelineEvents?: OrderTimelineEvent[];
  shippingAddress?: {
    fullName: string;
    phone: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export const orderApi = {
  getOrders: async (): Promise<{ orders: Order[] }> => {
    const response = await axiosInstance.get('/api/orders');
    return response.data;
  },
  getOrder: async (orderId: string): Promise<{ order: Order }> => {
    const response = await axiosInstance.get(`/api/orders/${orderId}`);
    return response.data;
  },
  cancelOrder: async (orderId: string): Promise<any> => {
    const response = await axiosInstance.patch(`/api/orders/${orderId}/cancel`);
    return response.data;
  },
  confirmDelivery: async (sellerOrderId: string): Promise<any> => {
    const response = await axiosInstance.patch(`/api/orders/seller-order/${sellerOrderId}/confirm`);
    return response.data;
  },
  downloadInvoice: async (orderId: string): Promise<any> => {
    const response = await axiosInstance.get(`/api/orders/${orderId}/invoice`);
    return response.data;
  },
};
