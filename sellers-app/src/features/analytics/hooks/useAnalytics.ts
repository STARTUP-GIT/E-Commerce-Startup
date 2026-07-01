import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analyticsApi';
import { analyticsService } from '../services/analyticsService';

export function useAnalytics() {
  const metricsQuery = useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: analyticsApi.getDashboardMetrics,
  });

  const salesSummaryQuery = useQuery({
    queryKey: ['analytics-sales-summary'],
    queryFn: analyticsApi.getSalesSummary,
  });

  const monthlyRevenueQuery = useQuery({
    queryKey: ['analytics-monthly-revenue'],
    queryFn: analyticsApi.getMonthlyRevenue,
  });

  const topSellingQuery = useQuery({
    queryKey: ['analytics-top-selling'],
    queryFn: () => analyticsApi.getTopSellingProducts(),
  });

  const chartData = monthlyRevenueQuery.data?.revenue
    ? analyticsService.transformRevenueData(monthlyRevenueQuery.data.revenue)
    : [];

  return {
    metrics: metricsQuery.data ?? null,
    isLoadingMetrics: metricsQuery.isLoading,
    isErrorMetrics: metricsQuery.isError,

    salesSummary: salesSummaryQuery.data ?? null,
    isLoadingSales: salesSummaryQuery.isLoading,

    monthlyRevenue: monthlyRevenueQuery.data ?? null,
    chartData,
    isLoadingRevenue: monthlyRevenueQuery.isLoading,

    topSelling: topSellingQuery.data?.products ?? [],
    isLoadingTop: topSellingQuery.isLoading,
  };
}
