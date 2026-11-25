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
    fulfilmentType?: 'READY_TO_SHIP' | 'MADE_TO_ORDER';
    minPrepDays?: number | null;
    maxPrepDays?: number | null;
    prepTimeType?: 'CALENDAR_DAYS' | 'BUSINESS_DAYS' | null;
    productionNotes?: string | null;
    estimatedReadyDate?: string | null;
  }[];
  subtotal: number;
  shippingTotal: number;
  packingFeeTotal: number;
  platformFeeTotal: number;
  discountTotal: number;
  taxTotal: number;
  availablePackaging?: Array<{
    id: string;
    shopId: string;
    shopName: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    type: string | null;
    isOptional: boolean;
  }>;
  packagingSnapshots?: Array<{
    id?: string;
    packagingOptionId?: string;
    name: string;
    price: number;
    quantity: number;
    totalFee: number;
    imageUrl?: string;
    isOptional: boolean;
  }>;
  productTaxableTotal?: number;
  productCgstTotal?: number;
  productSgstTotal?: number;
  productIgstTotal?: number;
  platformFeeCgstTotal?: number;
  platformFeeSgstTotal?: number;
  platformFeeIgstTotal?: number;
  placeOfSupplyState?: string;
  isInterState?: boolean;
  grandTotal: number;
  appliedCoupon?: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
  } | null;
}

export const checkoutApi = {
  getSummary: async (
    couponCode?: string,
    buyNow?: BuyNowParams,
    selectedDeliveryMethod?: string,
    selectedPackaging?: Array<{ packagingOptionId: string; quantity?: number }>
  ): Promise<{ checkoutSummary: CheckoutSummary }> => {
    const response = await axiosInstance.post('/api/checkout', {
      couponCode,
      buyNow,
      selectedDeliveryMethod,
      selectedPackaging,
    });
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
  getPaymentMethods: async (): Promise<{ paymentMethods: Array<{ id: string; name: string; code: string; description?: string; enabled: boolean; displayOrder: number }> }> => {
    const response = await axiosInstance.get('/api/checkout/payment-methods');
    return response.data;
  },
  getDeliveryMethods: async (): Promise<{ deliveryMethods: Array<{ id: string; name: string; code: string; description?: string; enabled: boolean; displayOrder: number }> }> => {
    const response = await axiosInstance.get('/api/checkout/delivery-methods');
    return response.data;
  },
  getShopPackaging: async (shopId: string): Promise<{ packagingOptions: any[] }> => {
    const response = await axiosInstance.get(`/api/shops/${shopId}/packaging`);
    return response.data;
  },
  checkoutCod: async (payload: {
    shippingAddressId: string;
    billingAddressId?: string;
    couponCode?: string;
    buyNow?: BuyNowParams;
    selectedDeliveryMethod?: string;
    selectedPackaging?: Array<{ packagingOptionId: string; quantity?: number }>;
  }): Promise<{ message: string; order: any }> => {
    const response = await axiosInstance.post('/api/checkout/cod', payload);
    return response.data;
  },
};
