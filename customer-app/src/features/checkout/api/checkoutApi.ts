import axiosInstance from '@/lib/axios/axiosInstance';

export interface CheckoutSummary {
  items: {
    productId: string;
    productVariantId?: string;
    name: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  appliedCoupon?: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
  } | null;
}

export const checkoutApi = {
  getSummary: async (couponCode?: string): Promise<{ checkoutSummary: CheckoutSummary }> => {
    const response = await axiosInstance.post('/api/checkout', { couponCode });
    return response.data;
  },
  validateCheckout: async (): Promise<{ isValid: boolean; message?: string }> => {
    const response = await axiosInstance.get('/api/checkout/validate');
    return response.data;
  },
  applyCoupon: async (couponCode: string): Promise<{ message: string; coupon: any; discount: number }> => {
    const response = await axiosInstance.post('/api/checkout/apply-coupon', { couponCode });
    return response.data;
  },
  removeCoupon: async (couponCode: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/api/checkout/remove-coupon', { couponCode });
    return response.data;
  },
};
