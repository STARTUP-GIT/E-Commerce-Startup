import axiosInstance from '@/lib/axios/axiosInstance';
import type { BrandingConfig, FeatureFlag, UiBuilderLayout, PlatformSettings } from '@/types/platform';

export const platformSettingsApi = {
  getSettings: async (): Promise<{ settings: PlatformSettings }> => {
    const response = await axiosInstance.get('/api/platform/settings');
    return response.data;
  },
  updateBranding: async (payload: Partial<BrandingConfig>): Promise<{ message: string; settings: PlatformSettings }> => {
    const response = await axiosInstance.put('/api/platform/branding', payload);
    return response.data;
  },
  updateUiLayout: async (payload: Partial<UiBuilderLayout>): Promise<{ message: string; settings: PlatformSettings }> => {
    const response = await axiosInstance.patch('/api/platform/settings/ui-layout', payload);
    return response.data;
  },
};

export const featureFlagsApi = {
  list: async (application?: 'CUSTOMER' | 'SELLER'): Promise<{ features: FeatureFlag[] }> => {
    const response = await axiosInstance.get('/api/platform/feature-flags', {
      params: application ? { application } : undefined,
    });
    return response.data;
  },
  toggle: async (id: string, enabled?: boolean): Promise<{ message: string; feature: FeatureFlag }> => {
    const response = await axiosInstance.patch(`/api/platform/feature-flags/${id}/toggle`, { enabled });
    return response.data;
  },
};
