import axios from 'axios';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { supabase } from '@/lib/supabase';

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

    // Centralized authentication: prefer the authenticated Supabase session's
    // access token (the real logged-in user token). This is the token the
    // backend verifies against the Supabase project's JWKS. If there is no
    // Supabase session (e.g. email/password login), fall back to the app-signed
    // seller_token that /seller/api/auth/google and /auth/login return.
    if (typeof window !== 'undefined') {
      let bearerToken: string | null = null;

      try {
        const { data } = await supabase.auth.getSession();
        bearerToken = data.session?.access_token ?? null;
      } catch {
        bearerToken = null;
      }

      if (!bearerToken) {
        bearerToken = localStorage.getItem('seller_token');
      }

      if (bearerToken) {
        if (!config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${bearerToken}`;
        }
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
