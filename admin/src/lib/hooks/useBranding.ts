'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import {
  DEFAULT_BRANDING,
  fetchBranding,
  normalizeBranding,
} from '@/lib/services/brandingService';
import type { BrandingConfig } from '@/lib/services/brandingService';

/** Admin-facing branding row (superset of the public BrandingConfig). */
export interface AdminBranding extends BrandingConfig {
  brandName: string;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string;
  supportPhone?: string;
  updatedBy?: string;
}

export interface BrandingPayload {
  brandName?: string;
  name?: string;
  shortName?: string;
  tagline?: string;
  logoUrl?: string;
  faviconUrl?: string;
  browserTitle?: string;
  seoTitle?: string;
  seoDescription?: string;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string;
  supportPhone?: string;
  heroBadge?: string;
  heroHeadingLine1?: string;
  heroHeadingLine2?: string;
  heroHeadingLine3?: string;
  heroDescription?: string;
  searchPlaceholder?: string;
  exploreShopsButtonText?: string;
  browseProductsButtonText?: string;
  footerDescription?: string;
}

export const brandingApi = {
  getBranding: async (): Promise<{ branding: AdminBranding }> => {
    const response = await axiosInstance.get('/api/admin/settings/branding');
    return response.data;
  },
  updateBranding: async (payload: BrandingPayload): Promise<{ branding: AdminBranding; message: string }> => {
    const response = await axiosInstance.put('/api/admin/settings/branding', payload);
    return response.data;
  },
};

/**
 * Display-only branding for ANY screen (including unauthenticated ones):
 * reads the public SSOT `GET /api/branding/public`.
 */
export function useBranding() {
  const { data, isLoading, isError } = useQuery<BrandingConfig>({
    queryKey: ['public-branding'],
    queryFn: async () => normalizeBranding(await fetchBranding(axiosInstance)),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  return { branding: data || DEFAULT_BRANDING, isLoading, isError };
}

/** Editor branding for Admin → Branding (requires an authenticated admin). */
export function useAdminBranding() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-branding'],
    queryFn: async () => (await brandingApi.getBranding()).branding,
    staleTime: 30_000,
    retry: false,
  });

  return { branding: data, isLoading, isError };
}

export function useUpdateBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BrandingPayload) => brandingApi.updateBranding(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-branding'] });
      queryClient.invalidateQueries({ queryKey: ['public-branding'] });
    },
  });
}
