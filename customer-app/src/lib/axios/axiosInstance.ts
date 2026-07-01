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
const axiosInstance = axios.create({
  baseURL: 'http://localhost:3001/users',   // empty — we use full relative paths from API_ROUTES
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  (response) => response,
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
