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

// Server-side: backend mounts all customer routes at /users (see app.ts lines 149-163).
// Client-side: empty baseURL → Next.js rewrites proxy to /users/api/* on the backend.
const axiosInstance = axios.create({
  baseURL: isServer ? `${serverBackendUrl!.replace(/\/$/, '')}/users` : '',
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

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor with single-flight refresh coordination
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || '';

    const isAuthEndpoint =
      url.includes('/api/customer/login') ||
      url.includes('/api/customer/refresh') ||
      url.includes('/api/customer/logout') ||
      url.includes('/api/auth');

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint && !isServer) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post('/api/customer/refresh', {}, { withCredentials: true });
        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        if (typeof window !== 'undefined') {
          try {
            const { signOut } = await import('next-auth/react');
            await signOut({ redirect: false });
          } catch {
            // NextAuth signOut cleanup
          }
          const currentPath = window.location.pathname;
          if (!currentPath.startsWith('/login') && !currentPath.startsWith('/signup')) {
            window.location.href = `/login?expired=true&callbackUrl=${encodeURIComponent(currentPath)}`;
          }
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
    error.message = message;

    return Promise.reject(error);
  }
);

export default axiosInstance;
