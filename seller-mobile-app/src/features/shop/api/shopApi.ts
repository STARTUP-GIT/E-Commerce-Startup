import axiosInstance from '@/lib/axios/axiosInstance';

export interface ShopAddress {
  id: string;
  fullName: string;
  contactName?: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string;
  placeId?: string;
  doorNo?: string;
  buildingName?: string;
  street?: string;
  cross?: string;
  area?: string;
  landmark?: string;
  locationSource?: string;
  accuracyMeters?: number | null;
}

export interface ShopAvailability {
  shopId: string;
  isOnline: boolean;
  closingReason?: string | null;
  closedAt?: string | null;
  lastStatusChangedAt?: string | null;
  lastStatusChangeSource?: string | null;
  lastStatusChangedBy?: string | null;
  scheduledCloseAt?: string | null;
  scheduledCloseReason?: string | null;
  scheduledCloseNoticeSent?: boolean;
  timeZone?: string;
  activeOrdersCount: number;
  isCountdownActive: boolean;
  countdownSecondsRemaining: number | null;
  recentLogs?: Array<{
    id: string;
    status: boolean;
    source: string;
    actorType: string;
    actorName?: string;
    reason?: string;
    createdAt: string;
  }>;
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
  packingFeeEnabled?: boolean;
  packingFeeAmount?: number;
  packingFeeApprovedMaxAmount?: number;
  packingFeeApprovalStatus?: string;
  packingFeeRequestedAt?: string;
  packingFeeApprovedAt?: string;
  packingFeeRejectedReason?: string;
  packingFeeRequests?: any[];
}

export interface PackagingOption {
  id: string;
  shopId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  imagePublicId: string | null;
  type: string | null;
  isOptional: boolean;
  applicableCategoryIds: string[];
  applicableProductIds: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'SUSPENDED';
  rejectionReason: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  district?: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string;
  placeId?: string;
  doorNo?: string;
  buildingName?: string;
  street?: string;
  cross?: string;
  area?: string;
  landmark?: string;
  locationSource?: string;
  accuracyMeters?: number | null;
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

  getBankAccount: async (): Promise<{ bankAccount: BankAccountDetails[] }> => {
    const response = await axiosInstance.get('/seller/api/shop/bank-account');
    return response.data;
  },

  addBankAccount: async (payload: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
  }): Promise<{ message: string; bankAccount: BankAccountDetails }> => {
    const response = await axiosInstance.post('/seller/api/shop/bank-account', payload);
    return response.data;
  },

  updateBankAccount: async (
    id: string,
    payload: Partial<Omit<BankAccountDetails, 'id' | 'isDefault' | 'isVerified'>>
  ): Promise<{
    message: string;
    bankAccount: BankAccountDetails;
  }> => {
    const response = await axiosInstance.put(`/seller/api/shop/bank-account/${id}`, payload);
    return response.data;
  },

  deleteBankAccount: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/seller/api/shop/bank-account/${id}`);
    return response.data;
  },

  setDefaultBankAccount: async (id: string): Promise<{ message: string; bankAccount: BankAccountDetails }> => {
    const response = await axiosInstance.patch(`/seller/api/shop/bank-account/${id}/default`);
    return response.data;
  },

  updateBanner: async (bannerUrl: string): Promise<{ message: string; shop: ShopInfo }> => {
    const response = await axiosInstance.put('/seller/api/shop/banner', { bannerUrl });
    return response.data;
  },

  updateLogo: async (logoUrl: string): Promise<{ message: string; shop: ShopInfo }> => {
    const response = await axiosInstance.put('/seller/api/shop/logo', { logoUrl });
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

  requestPackingFeeApproval: async (payload: {
    reason: string;
    requestedMaxFee: number;
    supportingNotes?: string;
  }): Promise<{ message: string; request: any }> => {
    const response = await axiosInstance.post('/seller/api/shop/packing-fee-approval-request', payload);
    return response.data;
  },

  togglePackingFee: async (payload: {
    enabled: boolean;
    amount?: number;
  }): Promise<{ message: string; shop: ShopInfo }> => {
    const response = await axiosInstance.patch('/seller/api/shop/packing-fee', payload);
    return response.data;
  },

  getPackagingOptions: async (): Promise<{ packagingOptions: PackagingOption[] }> => {
    const response = await axiosInstance.get('/seller/api/shop/packaging');
    return response.data;
  },

  createPackagingOption: async (payload: Partial<PackagingOption>): Promise<{ message: string; packagingOption: PackagingOption }> => {
    const response = await axiosInstance.post('/seller/api/shop/packaging', payload);
    return response.data;
  },

  updatePackagingOption: async (id: string, payload: Partial<PackagingOption>): Promise<{ message: string; packagingOption: PackagingOption; resubmittedForApproval: boolean }> => {
    const response = await axiosInstance.put(`/seller/api/shop/packaging/${id}`, payload);
    return response.data;
  },

  togglePackagingOption: async (id: string, isActive?: boolean): Promise<{ message: string; packagingOption: PackagingOption }> => {
    const response = await axiosInstance.patch(`/seller/api/shop/packaging/${id}/toggle`, { isActive });
    return response.data;
  },

  deletePackagingOption: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/seller/api/shop/packaging/${id}`);
    return response.data;
  },

  getLocationsStates: async (): Promise<{
    states: string[];
    allStates: Array<{ id: string; name: string; isEnabled: boolean }>;
    districtRequired: boolean;
  }> => {
    const response = await axiosInstance.get('/api/locations/states');
    return response.data;
  },

  getLocationsDistricts: async (stateName: string): Promise<{
    districts: string[];
    allDistricts: Array<{ id: string; name: string; isEnabled: boolean }>;
  }> => {
    const response = await axiosInstance.get(`/api/locations/states/${encodeURIComponent(stateName)}/districts`);
    return response.data;
  },

  searchAddresses: async (query: string, city?: string): Promise<any[]> => {
    const response = await axiosInstance.get('/api/locations/search', {
      params: { q: query, city },
    });
    return response.data?.results || [];
  },

  getAvailability: async (): Promise<{ availability: ShopAvailability }> => {
    const response = await axiosInstance.get('/seller/api/shop/availability');
    return response.data;
  },

  updateAvailability: async (payload: { isOnline: boolean; reason?: string; force?: boolean }): Promise<{ success?: boolean; requiresConfirmation?: boolean; activeOrdersCount?: number; message?: string; shop?: any }> => {
    const response = await axiosInstance.patch('/seller/api/shop/availability', payload);
    return response.data;
  },

  scheduleClosing: async (payload: { scheduledCloseAt: string; closingReason?: string; timeZone?: string }): Promise<{ success: boolean; shop: any; activeOrdersCount?: number }> => {
    const response = await axiosInstance.post('/seller/api/shop/schedule-closing', payload);
    return response.data;
  },

  cancelScheduledClosing: async (): Promise<{ success: boolean; shop: any; activeOrdersCount?: number }> => {
    const response = await axiosInstance.post('/seller/api/shop/cancel-scheduled-closing');
    return response.data;
  },
};
