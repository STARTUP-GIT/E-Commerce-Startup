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
