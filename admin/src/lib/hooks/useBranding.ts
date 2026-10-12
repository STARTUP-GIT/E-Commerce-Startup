import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  logoPublicId?: string | null;
  faviconPublicId?: string | null;
  darkLogoUrl?: string | null;
  darkLogoPublicId?: string | null;
  lightLogoUrl?: string | null;
  lightLogoPublicId?: string | null;
  brandDescription?: string | null;
  customerTitle?: string | null;
  sellerPortalTitle?: string | null;
  sellerPortalTagline?: string | null;
  sellerPortalLogoUrl?: string | null;
  sellerPortalLogoPublicId?: string | null;
  supportEmail?: string;
  supportPhone?: string;
  heroBadge: string;
  heroHeadingLine1: string;
  heroHeadingLine2: string;
  heroHeadingLine3: string;
  heroDescription: string;
  searchPlaceholder: string;
  exploreShopsButtonText: string;
  browseProductsButtonText: string;
  footerDescription: string;
  updatedBy: string;
}

export interface BrandingPayload {
  brandName?: string;
  name?: string;
  marketplaceName?: string;
  shortName?: string;
  tagline?: string;
  brandDescription?: string;
  logoUrl?: string;
  logoPublicId?: string | null;
  logo?: string;
  darkLogoUrl?: string;
  darkLogoPublicId?: string | null;
  lightLogoUrl?: string;
  lightLogoPublicId?: string | null;
  faviconUrl?: string;
  faviconPublicId?: string | null;
  favicon?: string;
  customerTitle?: string;
  sellerPortalTitle?: string;
  sellerPortalTagline?: string;
  sellerPortalLogoUrl?: string;
  sellerPortalLogoPublicId?: string | null;
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
  getBranding: async (app: BrandingApp = 'customer'): Promise<{ branding: AdminBranding }> => {
    const response = await axiosInstance.get('/api/admin/settings/branding', { params: { app } });
    return response.data;
  },
  updateBranding: async (
    payload: BrandingPayload,
    app: BrandingApp = 'customer'
  ): Promise<{ branding: AdminBranding; message: string }> => {
    const response = await axiosInstance.put('/api/admin/settings/branding', payload, { params: { app } });
    return response.data;
  },
};

/**
 * Display-only branding for ANY screen (including unauthenticated ones):
 * reads the public `GET /api/branding/public` for the requested app.
 */
export function useBranding(app: BrandingApp = 'customer') {
  const { data, isLoading, isError } = useQuery<BrandingConfig>({
    queryKey: ['public-branding', app],
    queryFn: async () => normalizeBranding(await fetchBranding(axiosInstance, app)),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  return {
    branding: data || (app === 'seller' ? DEFAULT_SELLER_BRANDING : DEFAULT_BRANDING),
    isLoading,
    isError,
  };
}

/** Editor branding for Admin → Customer / Seller Branding (requires authenticated admin). */
export function useAdminBranding(app: BrandingApp = 'customer') {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-branding', app],
    queryFn: async () => (await brandingApi.getBranding(app)).branding,
    staleTime: 30_000,
    retry: false,
  });

  return { branding: data, isLoading, isError, refetch };
}

export function useUpdateBranding(app: BrandingApp = 'customer') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BrandingPayload) => brandingApi.updateBranding(payload, app),
    onSuccess: () => {
      // Invalidate specifically for this app scope
      queryClient.invalidateQueries({ queryKey: ['admin-branding', app] });
      queryClient.invalidateQueries({ queryKey: ['public-branding', app] });
    },
  });
}

export function useCustomerBranding() {
  return useAdminBranding('customer');
}

export function useSellerBranding() {
  return useAdminBranding('seller');
}

export function useUpdateCustomerBranding() {
  return useUpdateBranding('customer');
}

export function useUpdateSellerBranding() {
  return useUpdateBranding('seller');
}
