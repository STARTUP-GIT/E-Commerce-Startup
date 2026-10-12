import axiosInstance from '@/lib/axios/axiosInstance';

export interface Address {
  id: string;
  type: string;
  label?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string;
  placeId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileResponse {
  message: string;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    phone?: string;
    avatarUrl?: string;
    addresses?: Address[];
  };
}

export interface EditProfilePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface UpdateProfilePayload {
  phone?: string;
  type?: string;
  label?: string;
  fullName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string;
  placeId?: string;
}

export interface CreateAddressPayload {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state: string;
  postalCode: string;
  country?: string;
  type?: string;
  label?: string;
  isDefault?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string;
  placeId?: string;
}

export interface UpdateAddressPayload extends Partial<CreateAddressPayload> {}

export const profileApi = {
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await axiosInstance.get('/api/auth/profile');
    return response.data;
  },
  editProfile: async (payload: EditProfilePayload): Promise<ProfileResponse> => {
    const response = await axiosInstance.put('/api/auth/profile/edit', payload);
    return response.data;
  },
  updateProfile: async (payload: UpdateProfilePayload): Promise<ProfileResponse> => {
    const response = await axiosInstance.post('/api/auth/profile/update', payload);
    return response.data;
  },
  getAddresses: async (): Promise<{ success: boolean; addresses: Address[] }> => {
    const response = await axiosInstance.get('/customer/addresses');
    return response.data;
  },
  getAddressById: async (id: string): Promise<{ success: boolean; address: Address }> => {
    const response = await axiosInstance.get(`/customer/addresses/${id}`);
    return response.data;
  },
  createAddress: async (payload: CreateAddressPayload): Promise<{ success: boolean; address: Address }> => {
    const response = await axiosInstance.post('/customer/addresses', payload);
    return response.data;
  },
  updateAddress: async (id: string, payload: UpdateAddressPayload): Promise<{ success: boolean; address: Address }> => {
    const response = await axiosInstance.put(`/customer/addresses/${id}`, payload);
    return response.data;
  },
  deleteAddress: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete(`/customer/addresses/${id}`);
    return response.data;
  },
  setDefaultAddress: async (id: string): Promise<{ success: boolean; address: Address }> => {
    const response = await axiosInstance.patch(`/customer/addresses/${id}/default`);
    return response.data;
  },
  deactivateAccount: async (): Promise<any> => {
    const response = await axiosInstance.delete('/api/auth/profile/deactivate');
    return response.data;
  },
  deleteProfile: async (): Promise<any> => {
    const response = await axiosInstance.delete('/api/auth/profile/delete');
    return response.data;
  },
  getLocationsStates: async (): Promise<{ states: { id: string; name: string }[]; allStates?: { id: string; name: string; isEnabled: boolean }[]; districtRequired: boolean }> => {
    const response = await axiosInstance.get<Array<{ id: string; name: string }>>('/customer/api/location/states');
    const statesArray = response.data;
    return {
      states: statesArray,
      allStates: statesArray.map(s => ({ id: s.id, name: s.name, isEnabled: true })),
      districtRequired: true,
    };
  },
  getLocationsDistricts: async (state: string): Promise<{ districts: string[]; allDistricts?: { id: string; name: string; isEnabled: boolean; stateId: string }[] }> => {
    const response = await axiosInstance.get<Array<{ id: string; name: string; stateId: string }>>('/customer/api/location/districts', { params: { state } });
    const districtsArray = response.data;
    return {
      districts: districtsArray.map(d => d.name),
      allDistricts: districtsArray.map(d => ({ id: d.id, name: d.name, isEnabled: true, stateId: d.stateId })),
    };
  },
};
