import axiosInstance from '@/lib/axios/axiosInstance';

export interface SignupPayload {
  username: string;
  email: string;
  password?: string;
  firstName: string;
  lastName?: string;
}

export interface SignupResponse {
  user: {
    id: string;
    email: string;
    username: string;
    fullname: string;
  };
}

export const signupApi = {
  register: async (payload: SignupPayload): Promise<SignupResponse> => {
    const response = await axiosInstance.post('/api/auth/register', payload);
    return response.data;
  },
};
