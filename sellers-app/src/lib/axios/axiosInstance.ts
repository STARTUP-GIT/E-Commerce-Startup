import axios from 'axios';
import { useConfirmStore } from '@/lib/store/confirmStore';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL || '',
  withCredentials: true,
});

// Set Content-Type per-request — never for FormData (browser sets multipart boundary)
axiosInstance.interceptors.request.use(
  (config) => {
    const isFormData =
      config.data instanceof FormData ||
      (config.data &&
        Object.prototype.toString.call(config.data) === '[object FormData]');

    if (isFormData) {
      delete config.headers['Content-Type'];
    } else if (config.data) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Unwrap backend error messages for cleaner DX
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
      
    if (error.response?.status === 403) {
      useConfirmStore.getState().showAlert({
        title: 'Action Restricted',
        message: message,
        confirmText: 'Acknowledge',
      });
    }

    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;
