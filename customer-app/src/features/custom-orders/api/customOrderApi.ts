import axiosInstance from '@/lib/axios/axiosInstance';
import axios from 'axios';

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
  getUploadUrl: async (filename: string, contentType: string): Promise<{ url: string; key: string }> => {
    const port = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).port : '3001';
    const baseUrl = `http://localhost:${port}/api/storage/upload-url`;
    const response = await axios.post(baseUrl, { filename, contentType }, { withCredentials: true });
    return response.data;
  },
  uploadFileDirectly: async (url: string, file: File, contentType: string): Promise<any> => {
    const response = await axios.put(url, file, {
      headers: {
        'Content-Type': contentType,
      },
    });
    return response.data;
  },
};
