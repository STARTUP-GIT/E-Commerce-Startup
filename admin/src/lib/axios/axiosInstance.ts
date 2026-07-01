import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '', // Let Next.js rewrites proxy requests based on route
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
