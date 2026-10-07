'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import {
  DEFAULT_BRANDING,
  DEFAULT_SELLER_BRANDING,
  fetchBranding,
  normalizeBranding,
} from '@/lib/services/brandingService';
import type { BrandingApp, BrandingConfig } from '@/lib/services/brandingService';

/** Admin-facing branding row (superset of the public BrandingConfig). */
export interface AdminBranding extends BrandingConfig {
  brandName: string;
  logoPublicId?: string | null;
  faviconPublicId?: string | null;
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
  logoPublicId?: string | null;
  faviconUrl?: string;
  faviconPublicId?: string | null;
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

const resolveBrandingApp = (app: BrandingApp = 'customer'): BrandingApp => app === 'seller' ? 'customer' : app;

export const brandingApi = {
  getBranding: async (app: BrandingApp = 'customer'): Promise<{ branding: AdminBranding }> => {
    const resolvedApp = resolveBrandingApp(app);
    const response = await axiosInstance.get('/api/admin/settings/branding', { params: { app: resolvedApp } });
    return response.data;
  },
  updateBranding: async (
    payload: BrandingPayload,
    app: BrandingApp = 'customer'
  ): Promise<{ branding: AdminBranding; message: string }> => {
    const resolvedApp = resolveBrandingApp(app);
    const response = await axiosInstance.put('/api/admin/settings/branding', payload, { params: { app: resolvedApp } });
    return response.data;
  },
};

/**
 * Display-only branding for ANY screen (including unauthenticated ones):
 * reads the public SSOT `GET /api/branding/public`.
 */
export function useBranding(app: BrandingApp = 'customer') {
  const resolvedApp = resolveBrandingApp(app);
  const { data, isLoading, isError } = useQuery<BrandingConfig>({
    queryKey: ['public-branding', resolvedApp],
    queryFn: async () => normalizeBranding(await fetchBranding(axiosInstance, resolvedApp)),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  return {
    branding: data || DEFAULT_BRANDING,
    isLoading,
    isError,
  };
}

/** Editor branding for Admin → Branding (requires an authenticated admin). */
export function useAdminBranding(app: BrandingApp = 'customer') {
  const resolvedApp = resolveBrandingApp(app);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-branding', resolvedApp],
    queryFn: async () => (await brandingApi.getBranding(resolvedApp)).branding,
    staleTime: 30_000,
    retry: false,
  });

  return { branding: data, isLoading, isError };
}

export function useUpdateBranding(app: BrandingApp = 'customer') {
  const queryClient = useQueryClient();
  const resolvedApp = resolveBrandingApp(app);
  return useMutation({
    mutationFn: (payload: BrandingPayload) => brandingApi.updateBranding(payload, resolvedApp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-branding'] });
      queryClient.invalidateQueries({ queryKey: ['public-branding'] });
    },
  });
}
