import axios from 'axios';
import { useConfirmStore } from '@/lib/store/confirmStore';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL || '',
  withCredentials: true,
});

// Set Content-Type per-request — never for FormData (browser sets multipart boundary)
axiosInstance.interceptors.request.use(
  async (config) => {
    const isFormData =
      config.data instanceof FormData ||
      (config.data &&
        Object.prototype.toString.call(config.data) === '[object FormData]');

    if (isFormData) {
      delete config.headers['Content-Type'];
    } else if (config.data) {
      config.headers['Content-Type'] = 'application/json';
    }

    // Centralized authentication. The backend issues ONE kind of credential for
    // the seller portal: the app-signed JWT returned by /seller/api/auth/login,
    // /seller/api/auth/register, and /seller/api/auth/google. Every path stores
    // that token in localStorage under `seller_token` (see useAuth / App.tsx).
    //
    // We therefore always send `seller_token` as the Bearer credential. We must
    // NOT prefer the raw Supabase access token: it has a short (~1h) lifetime and
    // a stale/expired Supabase session would otherwise override the still-valid
    // 7-day app JWT, producing 401s on /seller/api/auth/profile. The Supabase
    // session is only used to bootstrap the Google sync; the app JWT it returns
    // is the single auth source for every API request.
    if (typeof window !== 'undefined') {
      const bearerToken = localStorage.getItem('seller_token');

      if (bearerToken) {
        config.headers.Authorization = `Bearer ${bearerToken}`;
        // Redundant header so the backend can authenticate even if a proxy or
        // CDN strips the Authorization header.
        config.headers['x-seller-token'] = bearerToken;
      }
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
