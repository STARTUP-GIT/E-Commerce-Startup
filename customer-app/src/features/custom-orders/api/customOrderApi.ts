import axiosInstance from '@/lib/axios/axiosInstance';

export interface CustomOrderFile {
  id?: string;
  fileName: string;
  fileUrl: string;
  fileType: 'STL' | 'STEP' | 'OBJ' | 'PDF' | 'IMAGE' | 'OTHER';
  fileSizeBytes: number;
  mimeType?: string;
}

export interface CustomOrderQuote {
  id: string;
  sellerId: string;
  quotedPrice: number;
  estimatedDays: number;
  validUntil: string;
  isAccepted: boolean;
  rejectedAt?: string;
  rejectionReason?: string;
  seller?: {
    firstName: string;
    lastName: string;
    shop?: {
      name: string;
      slug: string;
    };
  };
}

export interface CustomOrder {
  id: string;
  orderNumber: string;
  title: string;
  description: string;
  material?: string;
  quantity: number;
  status: string;
  specifications?: any;
  submittedAt: string;
  files: CustomOrderFile[];
  quotes: CustomOrderQuote[];
  timelineEvents?: any[];
}

export interface CreateCustomOrderPayload {
  title: string;
  description: string;
  material?: string;
  quantity?: number;
  specifications?: any;
  files?: Omit<CustomOrderFile, 'id'>[];
  shippingAddressId?: string;
}

export const customOrderApi = {
  create: async (payload: CreateCustomOrderPayload): Promise<{ customOrder: CustomOrder }> => {
    const response = await axiosInstance.post('/api/custom-orders', payload);
    return response.data;
  },
  getOrders: async (): Promise<{ customOrders: CustomOrder[] }> => {
    const response = await axiosInstance.get('/api/custom-orders');
    return response.data;
  },
  getOrder: async (id: string): Promise<{ customOrder: CustomOrder }> => {
    const response = await axiosInstance.get(`/api/custom-orders/${id}`);
    return response.data;
  },
  cancel: async (id: string, reason?: string): Promise<any> => {
    const response = await axiosInstance.delete(`/api/custom-orders/${id}`, { data: { reason } });
    return response.data;
  },
  acceptQuote: async (orderId: string, quoteId: string): Promise<any> => {
    const response = await axiosInstance.patch(`/api/custom-orders/${orderId}/accept-quotation`, { quoteId });
    return response.data;
  },
  rejectQuote: async (orderId: string, quoteId: string, reason?: string): Promise<any> => {
    const response = await axiosInstance.patch(`/api/custom-orders/${orderId}/reject-quotation`, { quoteId, reason });
    return response.data;
  },
};
