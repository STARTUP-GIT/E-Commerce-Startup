import axiosInstance from '@/lib/axios/axiosInstance';

export interface BuyNowParams {
  productId: string;
  productVariantId?: string;
  quantity: number;
}

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
  getSummary: async (couponCode?: string, buyNow?: BuyNowParams): Promise<{ checkoutSummary: CheckoutSummary }> => {
    const response = await axiosInstance.post('/api/checkout', { couponCode, buyNow });
    return response.data;
  },
  validateCheckout: async (buyNow?: BuyNowParams): Promise<{ isValid: boolean; message?: string }> => {
    const params = buyNow ? { buyNow: 'true', productId: buyNow.productId, productVariantId: buyNow.productVariantId, quantity: buyNow.quantity } : undefined;
    const response = await axiosInstance.get('/api/checkout/validate', { params });
    return response.data;
  },
  applyCoupon: async (couponCode: string, buyNow?: BuyNowParams): Promise<{ message: string; coupon: any; discount: number }> => {
    const response = await axiosInstance.post('/api/checkout/apply-coupon', { couponCode, buyNow });
    return response.data;
  },
  removeCoupon: async (couponCode: string, buyNow?: BuyNowParams): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/api/checkout/remove-coupon', { couponCode, buyNow });
    return response.data;
  },
};
