import axiosInstance from '@/lib/axios/axiosInstance';

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface LoginResponse {
  message: string;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
  };
}

export const loginApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await axiosInstance.post('/apiauth/login', credentials);
    return response.data;
  },
};
