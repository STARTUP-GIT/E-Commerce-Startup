import { useQuery, useQueryClient } from '@tanstack/react-query';
import { platformSettingsApi } from '@/lib/api/platformApi';
import { useUIStore } from '@/lib/store/uiStore';
import type { BrandingConfig, UiBuilderLayout } from '@/types/platform';

export function useSettings() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const query = useQuery({
    queryKey: ['platform-settings'],
    queryFn: platformSettingsApi.getSettings,
    staleTime: 2 * 60 * 1000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['platform-settings'] });

  const persist = async (fn: () => Promise<{ message: string }>) => {
    try {
      const result = await fn();
      refresh();
      showToast(result.message, 'success');
      return result;
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to update settings.', 'error');
      throw error;
    }
  };

  return {
    settings: query.data?.settings ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refresh,
    persist,
    updateBranding: (payload: Partial<BrandingConfig>) => persist(() => platformSettingsApi.updateBranding(payload)),
    updateUiLayout: (payload: Partial<UiBuilderLayout>) => persist(() => platformSettingsApi.updateUiLayout(payload)),
  };
}
