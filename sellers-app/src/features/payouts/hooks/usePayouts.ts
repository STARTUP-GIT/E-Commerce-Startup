import { useQuery } from '@tanstack/react-query';
import { payoutApi } from '../api/payoutApi';

export function usePayouts() {
  const historyQuery = useQuery({
    queryKey: ['payouts-history'],
    queryFn: payoutApi.getPayoutHistory,
  });

  const pendingQuery = useQuery({
    queryKey: ['payouts-pending'],
    queryFn: payoutApi.getPendingPayouts,
  });

  const completedQuery = useQuery({
    queryKey: ['payouts-completed'],
    queryFn: payoutApi.getCompletedPayouts,
  });

  const summaryQuery = useQuery({
    queryKey: ['payouts-summary'],
    queryFn: payoutApi.getEarningsSummary,
  });

  return {
    payouts: historyQuery.data?.payouts ?? [],
    isLoadingHistory: historyQuery.isLoading,

    pendingPayouts: pendingQuery.data?.payouts ?? [],
    isLoadingPending: pendingQuery.isLoading,

    completedPayouts: completedQuery.data?.payouts ?? [],
    isLoadingCompleted: completedQuery.isLoading,

    summary: summaryQuery.data ?? null,
    isLoadingSummary: summaryQuery.isLoading,
  };
}
