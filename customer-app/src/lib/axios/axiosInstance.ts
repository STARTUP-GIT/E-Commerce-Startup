import axios from 'axios';
import { useLocationStore } from '@/lib/store/locationStore';

/**
 * Axios Instance — Proxy-Aware
 * ─────────────────────────────────────────────────────────────────────────────
 * baseURL is intentionally empty ("").
 * All requests use relative paths like  /api/shops/featured
 * which Next.js rewrites server-side to  BACKEND_API_URL/api/shops/featured
 *
 * This means:
 *  ✅ Backend URL is never exposed to the browser
 *  ✅ No CORS issues (same-origin requests)
 *  ✅ Works identically in dev and production
 *  ─────────────────────────────────────────────────────────────────────────────
 */
const isServer = typeof window === 'undefined';
const serverBackendUrl = process.env.BACKEND_API_URL;

if (isServer && !serverBackendUrl) {
  throw new Error('BACKEND_API_URL is required for server-side API calls.');
}

const axiosInstance = axios.create({
  baseURL: isServer ? `${serverBackendUrl!.replace(/\/$/, '')}/customer` : '',
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

axiosInstance.interceptors.request.use(
  (config) => {
    if (config.method?.toLowerCase() === 'get') {
      const store = useLocationStore.getState();
      if (store.selectedDistrict && store.selectedState) {
        config.params = {
          ...config.params,
          district: store.selectedDistrict,
          state: store.selectedState,
        };
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Unwrap backend error messages for cleaner DX
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;
