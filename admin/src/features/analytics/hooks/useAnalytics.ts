import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analyticsApi';

export function useDashboard() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: analyticsApi.getDashboard,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRevenue(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['analytics', 'revenue', params],
    queryFn: () => analyticsApi.getRevenue(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonthlyRevenue() {
  return useQuery({
    queryKey: ['analytics', 'monthly-revenue'],
    queryFn: analyticsApi.getMonthlyRevenue,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStatistics() {
  return useQuery({
    queryKey: ['analytics', 'statistics'],
    queryFn: analyticsApi.getStatistics,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentActivities() {
  return useQuery({
    queryKey: ['analytics', 'recent-activities'],
    queryFn: analyticsApi.getRecentActivities,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}
