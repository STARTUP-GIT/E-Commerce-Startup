import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/platformApi';
import { useUIStore } from '@/lib/store/uiStore';
import type { PlatformSettings } from '@/types/platform';

export function useSettings() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const query = useQuery({
    queryKey: ['platform-settings'],
    queryFn: settingsApi.get,
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
    updateMarketplace: (payload: Partial<PlatformSettings['marketplace']>) => persist(() => settingsApi.updateMarketplace(payload)),
    updateCommission: (payload: Partial<PlatformSettings['commission']>) => persist(() => settingsApi.updateCommission(payload)),
    updateMaintenance: (payload: Partial<PlatformSettings['maintenance']>) => persist(() => settingsApi.updateMaintenance(payload)),
    updatePaymentProviders: (providers: PlatformSettings['paymentProviders']) => persist(() => settingsApi.updatePaymentProviders(providers)),
    updateStorage: (payload: Partial<PlatformSettings['storage']>) => persist(() => settingsApi.updateStorage(payload)),
    updateEmailProviders: (providers: PlatformSettings['emailProviders']) => persist(() => settingsApi.updateEmailProviders(providers)),
    updateOAuthProviders: (providers: PlatformSettings['oauthProviders']) => persist(() => settingsApi.updateOAuthProviders(providers)),
    updateRazorpay: (payload: { enabled?: boolean; keyId?: string; keySecret?: string }) => persist(() => settingsApi.updateRazorpay(payload)),
  };
}
