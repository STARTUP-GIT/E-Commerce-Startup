import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featureFlagApi } from '../api/featureFlagApi';
import { useUIStore } from '@/lib/store/uiStore';
import type { FeatureFlagPayload } from '../types';

export function useFeatureFlags(params?: {
  status?: string;
  scope?: string;
  type?: string;
  search?: string;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const listQuery = useQuery({
    queryKey: ['feature-flags', params],
    queryFn: () => featureFlagApi.list(params),
  });

  const catalogQuery = useQuery({
    queryKey: ['feature-flags-catalog'],
    queryFn: featureFlagApi.getCatalog,
    staleTime: Infinity,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
  };

  const errorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const createMutation = useMutation({
    mutationFn: (payload: FeatureFlagPayload) => featureFlagApi.create(payload),
    onSuccess: () => {
      invalidate();
      showToast('Feature flag created successfully.', 'success');
    },
    onError: (error) => showToast(errorMessage(error, 'Failed to create feature flag.'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<FeatureFlagPayload> }) =>
      featureFlagApi.update(id, payload),
    onSuccess: () => {
      invalidate();
      showToast('Feature flag updated successfully.', 'success');
    },
    onError: (error) => showToast(errorMessage(error, 'Failed to update feature flag.'), 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => featureFlagApi.toggle(id, enabled),
    onSuccess: (data) => {
      invalidate();
      showToast(data.message, 'success');
    },
    onError: (error) => showToast(errorMessage(error, 'Failed to toggle feature flag.'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => featureFlagApi.remove(id),
    onSuccess: () => {
      invalidate();
      showToast('Feature flag deleted successfully.', 'success');
    },
    onError: (error) => showToast(errorMessage(error, 'Failed to delete feature flag.'), 'error'),
  });

  const rolloutMutation = useMutation({
    mutationFn: ({ id, rolloutPercentage }: { id: string; rolloutPercentage: number }) =>
      featureFlagApi.updateRollout(id, rolloutPercentage),
    onSuccess: () => {
      invalidate();
      showToast('Rollout updated successfully.', 'success');
    },
    onError: (error) => showToast(errorMessage(error, 'Failed to update rollout.'), 'error'),
  });

  return {
    flags: listQuery.data?.flags ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    catalog: catalogQuery.data,

    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    toggle: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,

    remove: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    updateRollout: rolloutMutation.mutateAsync,
    isUpdatingRollout: rolloutMutation.isPending,
  };
}
