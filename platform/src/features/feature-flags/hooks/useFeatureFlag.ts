import { useQuery } from '@tanstack/react-query';
import { featureFlagApi } from '../api/featureFlagApi';

export interface FeatureFlagContext {
  application?: string;
  userId?: string;
  shopId?: string;
}

/**
 * useFeatureFlag
 * ─────────────────────────────────────────────────────────────────────────────
 * THE shared helper for the entire frontend ecosystem.
 *
 * Evaluates a single feature through the backend Feature Engine. Any
 * app/frontend can call this hook with the same key — the evaluation is
 * consistent everywhere and reflects the latest state Platform toggled.
 *
 * Usage:
 *   const buyNow = useFeatureFlag('BUY_NOW', { application: 'CUSTOMER' });
 *   if (buyNow.enabled) { ... }
 */
export function useFeatureFlag(key: string, context: FeatureFlagContext = {}) {
  const query = useQuery({
    queryKey: ['feature-flag', key, context],
    queryFn: () => featureFlagApi.checkFlag(key, context),
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  });

  return {
    enabled: query.data?.enabled ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * useFeatureFlags — evaluates several flags in ONE request.
 *
 * const { results } = useFeatureFlags(['BUY_NOW', 'AI_SEARCH', 'WISHLIST']);
 * if (results['BUY_NOW']) { ... }
 */
export function useFeatureFlags(keys: string[], context: FeatureFlagContext = {}) {
  const query = useQuery({
    queryKey: ['feature-flags-engine', keys, context],
    queryFn: () => featureFlagApi.checkFlags(keys, context),
    staleTime: 60 * 1000,
    retry: 1,
    enabled: keys.length > 0,
  });

  return {
    results: query.data?.results ?? {},
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
