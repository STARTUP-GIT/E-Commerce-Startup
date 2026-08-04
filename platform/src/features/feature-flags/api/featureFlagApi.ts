import axiosInstance from '@/lib/axios/axiosInstance';
import type { FeatureFlag, FeatureFlagPayload } from '../types';

export interface FlagCatalog {
  types: string[];
  statuses: string[];
  scopes: string[];
}

export const featureFlagApi = {
  list: async (params?: {
    status?: string;
    scope?: string;
    type?: string;
    search?: string;
  }): Promise<{ flags: FeatureFlag[] }> => {
    const response = await axiosInstance.get('/api/platform/feature-flags', { params });
    return response.data;
  },

  get: async (id: string): Promise<{ flag: FeatureFlag }> => {
    const response = await axiosInstance.get(`/api/platform/feature-flags/${id}`);
    return response.data;
  },

  create: async (payload: FeatureFlagPayload): Promise<{ message: string; flag: FeatureFlag }> => {
    const response = await axiosInstance.post('/api/platform/feature-flags', payload);
    return response.data;
  },

  update: async (id: string, payload: Partial<FeatureFlagPayload>): Promise<{ message: string; flag: FeatureFlag }> => {
    const response = await axiosInstance.patch(`/api/platform/feature-flags/${id}`, payload);
    return response.data;
  },

  remove: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/api/platform/feature-flags/${id}`);
    return response.data;
  },

  toggle: async (id: string, enabled: boolean): Promise<{ message: string; flag: FeatureFlag }> => {
    const response = await axiosInstance.post(`/api/platform/feature-flags/${id}/toggle`, { enabled });
    return response.data;
  },

  updateRollout: async (id: string, rolloutPercentage: number): Promise<{ message: string; flag: FeatureFlag }> => {
    const response = await axiosInstance.post(`/api/platform/feature-flags/${id}/rollout`, { rolloutPercentage });
    return response.data;
  },

  getCatalog: async (): Promise<FlagCatalog> => {
    const response = await axiosInstance.get('/api/platform/feature-flags/catalog');
    return response.data;
  },

  // ── Engine (the shared helper) ──
  checkFlag: async (key: string, ctx?: { userId?: string; shopId?: string; environment?: string }): Promise<{ key: string; enabled: boolean }> => {
    const response = await axiosInstance.get('/api/platform/feature-flags/engine/check', { params: { key, ...ctx } });
    return response.data;
  },

  checkFlags: async (keys: string[]): Promise<{ results: Record<string, boolean> }> => {
    const response = await axiosInstance.post('/api/platform/feature-flags/engine/check', { keys });
    return response.data;
  },
};
