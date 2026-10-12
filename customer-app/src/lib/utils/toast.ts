import toast, { ToastOptions } from 'react-hot-toast';
import { getApiErrorMessage } from './apiError';

// Debounce cache to prevent duplicate toasts firing simultaneously
const recentToasts = new Map<string, number>();
const DEBOUNCE_MS = 1200;

function shouldShow(key: string): boolean {
  const now = Date.now();
  const lastTime = recentToasts.get(key) || 0;
  if (now - lastTime < DEBOUNCE_MS) {
    return false;
  }
  recentToasts.set(key, now);
  return true;
}

const defaultOptions: ToastOptions = {
  duration: 4000,
  style: {
    background: '#18181b', // zinc-900
    color: '#f4f4f5', // zinc-100
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: '500',
    maxWidth: '420px',
  },
};

export const appToast = {
  success: (message: string, options?: ToastOptions) => {
    if (!shouldShow(`success:${message}`)) return;
    return toast.success(message, {
      ...defaultOptions,
      duration: 4000,
      iconTheme: {
        primary: '#10b981', // emerald-500
        secondary: '#18181b',
      },
      ...options,
    });
  },

  error: (message: string, options?: ToastOptions) => {
    if (!shouldShow(`error:${message}`)) return;
    return toast.error(message, {
      ...defaultOptions,
      duration: 5000,
      iconTheme: {
        primary: '#ef4444', // red-500
        secondary: '#18181b',
      },
      ...options,
    });
  },

  info: (message: string, options?: ToastOptions) => {
    if (!shouldShow(`info:${message}`)) return;
    return toast(message, {
      ...defaultOptions,
      duration: 4000,
      icon: 'ℹ️',
      ...options,
    });
  },

  apiError: (error: any, fallbackMessage: string = 'An unexpected error occurred. Please try again.', options?: ToastOptions) => {
    const safeMsg = getApiErrorMessage(error, fallbackMessage);
    return appToast.error(safeMsg, options);
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },
};

export default appToast;
