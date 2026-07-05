import axiosInstance from '@/lib/axios/axiosInstance';

export interface BuyNowParams {
  productId: string;
  productVariantId?: string;
  quantity: number;
}

export interface CreatePaymentPayload {
  shippingAddressId: string;
  couponCode?: string;
  packingFees?: { sellerId: string; amount: number }[];
  buyNow?: BuyNowParams;
}

export interface RazorpayOrderDetails {
  gateway: 'RAZORPAY' | 'PHONEPE';
  gatewayOrderId: string;
  amount: number;
  currency: string;
  totals: any;
  phonepeDetails?: any;
}

export interface VerifyPaymentPayload {
  shippingAddressId: string;
  couponCode?: string;
  packingFees?: { sellerId: string; amount: number }[];
  buyNow?: BuyNowParams;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  merchantTransactionId?: string;
}

export const paymentApi = {
  createPayment: async (payload: CreatePaymentPayload): Promise<RazorpayOrderDetails> => {
    const response = await axiosInstance.post('/api/payment/create', payload);
    return response.data;
  },
  verifyPayment: async (payload: VerifyPaymentPayload): Promise<any> => {
    const response = await axiosInstance.post('/api/payment/verify', payload);
    return response.data;
  },
};
