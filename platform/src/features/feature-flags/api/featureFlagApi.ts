import axiosInstance from '@/lib/axios/axiosInstance';
import type { Feature } from '../types';

export const featureFlagApi = {
  list: async (params?: {
    search?: string;
    application?: string;
  }): Promise<{ features: Feature[] }> => {
    const response = await axiosInstance.get('/api/platform/feature-flags', { params });
    return response.data;
  },

  get: async (id: string): Promise<{ feature: Feature }> => {
    const response = await axiosInstance.get(`/api/platform/feature-flags/${id}`);
    return response.data;
  },

  toggle: async (id: string, enabled: boolean): Promise<{ message: string; feature: Feature }> => {
    const response = await axiosInstance.patch(`/api/platform/feature-flags/${id}/toggle`, { enabled });
    return response.data;
  },

  // ── Engine (the shared helper Customer & Seller use to read flags) ──
  checkFlag: async (
    key: string,
    ctx?: { application?: string; userId?: string; shopId?: string }
  ): Promise<{ key: string; enabled: boolean }> => {
    const response = await axiosInstance.get('/api/platform/feature-flags/engine/check', {
      params: { key, ...ctx },
    });
    return response.data;
  },

  checkFlags: async (
    keys: string[],
    ctx?: { application?: string }
  ): Promise<{ results: Record<string, boolean> }> => {
    const response = await axiosInstance.post('/api/platform/feature-flags/engine/check', {
      keys,
      application: ctx?.application,
    });
    return response.data;
  },
};
