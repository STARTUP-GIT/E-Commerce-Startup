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
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
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
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}

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
  deactivateAccount: async (): Promise<any> => {
    const response = await axiosInstance.delete('/api/auth/profile/deactivate');
    return response.data;
  },
  deleteProfile: async (): Promise<any> => {
    const response = await axiosInstance.delete('/api/auth/profile/delete');
    return response.data;
  },
  getLocationsStates: async (): Promise<{ states: { id: string; name: string }[]; allStates?: { id: string; name: string; isEnabled: boolean }[]; districtRequired: boolean }> => {
    const response = await axiosInstance.get('/customer/api/location/states');
    return response.data;
  },
  getLocationsDistricts: async (state: string): Promise<{ districts: string[]; allDistricts?: { id: string; name: string; isEnabled: boolean; stateId: string }[] }> => {
    const response = await axiosInstance.get('/customer/api/location/districts', { params: { state } });
    return response.data;
  },
};
