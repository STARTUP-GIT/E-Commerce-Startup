import axios from 'axios';

/**
 * Axios Instance — Proxy-Aware
 * ─────────────────────────────────────────────────────────────────────────────
 * On the CLIENT (browser), baseURL is empty (""). All requests use relative
 * paths like /api/admin/profile, which Next.js rewrites server-side to
 * ADMIN_BACKEND_API_URL/api/admin/profile. This means:
 *   ✅ Cookie domain matches — admin_session set on frontend origin is sent
 *   ✅ No CORS issues (same-origin requests in the browser)
 *   ✅ Works identically in dev and production
 *
 * On the SERVER (NextAuth authorize, server components), baseURL is the
 * backend URL so requests go directly to the backend.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const isServer = typeof window === 'undefined';
const axiosInstance = axios.create({
  baseURL: isServer ? (process.env.ADMIN_BACKEND_API_URL || '') : '',
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

// Response interceptor with single-flight refresh queue and automatic logout
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || '';

    const isAuthEndpoint =
      url.includes('/api/admin/auth/login') ||
      url.includes('/api/admin/auth/refresh') ||
      url.includes('/api/admin/auth/logout') ||
      url.includes('/api/admin/auth/setup');

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
        await axios.post('/api/admin/auth/refresh', {}, { withCredentials: true });
        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);

        if (typeof window !== 'undefined') {
          try {
            const { signOut } = await import('next-auth/react');
            await signOut({ redirect: false });
          } catch {
            // NextAuth cleanup
          }
          const currentPath = window.location.pathname;
          if (!currentPath.startsWith('/login')) {
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
