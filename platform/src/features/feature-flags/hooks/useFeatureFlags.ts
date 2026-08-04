import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featureFlagApi } from '../api/featureFlagApi';
import { useUIStore } from '@/lib/store/uiStore';

export function useFeatureFlags(params?: {
  search?: string;
  application?: string;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const listQuery = useQuery({
    queryKey: ['feature-flags', params],
    queryFn: () => featureFlagApi.list(params),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
  };

  const errorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      featureFlagApi.toggle(id, enabled),
    onSuccess: (data) => {
      invalidate();
      showToast(data.message, 'success');
    },
    onError: (error) => showToast(errorMessage(error, 'Failed to toggle feature.'), 'error'),
  });

  return {
    features: listQuery.data?.features ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,

    toggle: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
  };
}
