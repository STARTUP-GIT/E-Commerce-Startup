import axiosInstance from '@/lib/axios/axiosInstance';

export interface ShopAddress {
  id: string;
  fullName: string;
  contactName?: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ShopInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  isActive: boolean;
  defaultPickupAddress?: ShopAddress;
  commissionPercentage?: number;
  customerDeliveryShare?: number;
  sellerDeliveryShare?: number;
  packingFeeApproved?: boolean;
}

export interface BankAccountDetails {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
  isDefault: boolean;
  isVerified: boolean;
}

export interface ShopSetupPayload {
  shopName: string;
  slug: string;
  description?: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type?: string;
  label?: string;
  contactName?: string;
  gstRegistered?: boolean;
  gstNumber?: string;
}

export const shopApi = {
  getShop: async (): Promise<{ shop: ShopInfo }> => {
    const response = await axiosInstance.get('/seller/api/shop');
    return response.data;
  },

  createShop: async (payload: ShopSetupPayload): Promise<{ message: string; shop: ShopInfo }> => {
    const response = await axiosInstance.post('/seller/api/shop', payload);
    return response.data;
  },

  updateShop: async (payload: Partial<ShopSetupPayload>): Promise<{ message: string; shop: ShopInfo }> => {
    const response = await axiosInstance.put('/seller/api/shop', payload);
    return response.data;
  },

  applyApproval: async (payload: { gstRegistered: boolean; gstNumber?: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/seller/api/shop/apply-approval', payload);
    return response.data;
  },

  getApprovalStatus: async (): Promise<{
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
  }> => {
    const response = await axiosInstance.get('/seller/api/shop/approval-status');
    return response.data;
  },

  getBankAccount: async (): Promise<{ bankAccount: BankAccountDetails[] }> => {
    const response = await axiosInstance.get('/seller/api/shop/bank-account');
    return response.data;
  },

  addBankAccount: async (payload: Omit<BankAccountDetails, 'id' | 'isDefault' | 'isVerified'>): Promise<{
    message: string;
    bankAccount: BankAccountDetails;
  }> => {
    const response = await axiosInstance.post('/seller/api/shop/bank-account', payload);
    return response.data;
  },

  updateBanner: async (bannerUrl: string): Promise<{ message: string; shop: ShopInfo }> => {
    const response = await axiosInstance.patch('/seller/api/shop/banner', { bannerUrl });
    return response.data;
  },

  updateLogo: async (logoUrl: string): Promise<{ message: string; shop: ShopInfo }> => {
    const response = await axiosInstance.patch('/seller/api/shop/logo', { logoUrl });
    return response.data;
  },

  submitBanAppeal: async (payload: { subject: string; description: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/seller/api/shop/ban-appeal', payload);
    return response.data;
  },

  deleteShop: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.delete('/seller/api/shop');
    return response.data;
  },

  getLocationsStates: async (): Promise<{ states: string[]; allStates?: { name: string; isEnabled: boolean }[]; districtRequired: boolean }> => {
    const response = await axiosInstance.get('/seller/api/locations/states');
    return response.data;
  },
  getLocationsDistricts: async (state: string): Promise<{ districts: string[]; allDistricts?: { name: string; isEnabled: boolean }[] }> => {
    const response = await axiosInstance.get('/seller/api/locations/districts', { params: { state } });
    return response.data;
  },
};
