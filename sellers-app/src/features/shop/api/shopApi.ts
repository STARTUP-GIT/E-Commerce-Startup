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
  status: string;
  rejectionReason?: string;
  defaultPickupAddress?: ShopAddress;
  commissionPercentage?: number;
  commissionNotes?: string;
  packingFeeApproved?: boolean;
  enablePackingFee?: boolean;
  packingFeeRequests?: any[];
  deliveryMode?: 'PLATFORM' | 'SELF';
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
  deliveryMode?: 'PLATFORM' | 'SELF';
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

  requestPackingFeeApproval: async (payload: { reason: string; supportingNotes?: string }): Promise<{ message: string; request: any }> => {
    const response = await axiosInstance.post('/seller/api/shop/packing-fee/request', payload);
    return response.data;
  },

  togglePackingFee: async (enablePackingFee: boolean): Promise<{ message: string; shop: ShopInfo }> => {
    const response = await axiosInstance.patch('/seller/api/shop/packing-fee/toggle', { enablePackingFee });
    return response.data;
  },

  getLocationsStates: async (): Promise<{ states: string[]; allStates?: { name: string; isEnabled: boolean }[]; districtRequired: boolean }> => {
    const response = await axiosInstance.get<Array<{ id: string; name: string }>>('/seller/api/location/states');
    const statesArray = response.data;
    return {
      states: statesArray.map(s => s.name),
      allStates: statesArray.map(s => ({ name: s.name, isEnabled: true })),
      districtRequired: true,
    };
  },
  getLocationsDistricts: async (state: string): Promise<{ districts: string[]; allDistricts?: { name: string; isEnabled: boolean }[] }> => {
    const response = await axiosInstance.get<Array<{ id: string; name: string; stateId: string }>>('/seller/api/location/districts', { params: { state } });
    const districtsArray = response.data;
    return {
      districts: districtsArray.map(d => d.name),
      allDistricts: districtsArray.map(d => ({ name: d.name, isEnabled: true })),
    };
  },
};
