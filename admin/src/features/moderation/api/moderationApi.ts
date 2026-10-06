import axiosInstance from '@/lib/axios/axiosInstance';

export const REVIEW_PUBLISHED_FILTERS = [
  { value: '', label: 'All Reviews' },
  { value: 'true', label: 'Published' },
  { value: 'false', label: 'Hidden' },
] as const;

export const REPORT_STATUSES = ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning';

export const REPORT_STATUS_VARIANT: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'default',
  RESOLVED: 'success',
  DISMISSED: 'outline',
};

export interface ReviewItem {
  id: string;
  customerId: string;
  productId: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  reply?: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string;
  customer?: { id: string; username?: string | null; email?: string | null } | null;
  product?: {
    id: string;
    name?: string | null;
    shop?: { id?: string; name?: string | null } | null;
  } | null;
  shop?: { id?: string; name?: string | null } | null;
}

export interface ReportItem {
  id: string;
  productId: string;
  customerId: string;
  reason: string;
  description?: string | null;
  status: ReportStatus | string;
  resolution?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  customer?: { id: string; username?: string | null; email?: string | null } | null;
  product?: {
    id: string;
    name?: string | null;
    sellerId?: string | null;
    seller?: {
      id?: string;
      shop?: { id?: string; name?: string | null; ownerId?: string } | null;
    } | null;
  } | null;
  shop?: { id?: string; name?: string | null } | null;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ReviewListResponse {
  reviews: ReviewItem[];
  pagination: Pagination;
}

export interface ReportListResponse {
  reports: ReportItem[];
  pagination: Pagination;
}

export interface ShopReportListResponse {
  shopReports: ReportItem[];
}

export const moderationApi = {
  // GET /api/admin/reviews → { reviews, pagination }  (filter: published=true|false)
  getReviews: async (params?: {
    published?: string;
    page?: number;
    limit?: number;
  }): Promise<ReviewListResponse> => {
    const response = await axiosInstance.get('/api/admin/reviews', { params });
    return response.data;
  },

  hideReview: async (id: string): Promise<{ message: string; review: ReviewItem }> => {
    const response = await axiosInstance.patch(`/api/admin/reviews/${id}/hide`);
    return response.data;
  },

  restoreReview: async (id: string): Promise<{ message: string; review: ReviewItem }> => {
    const response = await axiosInstance.patch(`/api/admin/reviews/${id}/restore`);
    return response.data;
  },

  deleteReview: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/api/admin/reviews/${id}`);
    return response.data;
  },

  // GET /api/admin/reports/products → { reports, pagination } (PENDING + UNDER_REVIEW only)
  getReportedProducts: async (params?: { page?: number; limit?: number }): Promise<ReportListResponse> => {
    const response = await axiosInstance.get('/api/admin/reports/products', { params });
    return response.data;
  },

  // GET /api/admin/reports/shops → { shopReports } (no pagination)
  getReportedShops: async (): Promise<ShopReportListResponse> => {
    const response = await axiosInstance.get('/api/admin/reports/shops');
    return response.data;
  },

  resolveReport: async (id: string, resolution: string): Promise<{ message: string; report: ReportItem }> => {
    const response = await axiosInstance.patch(`/api/admin/reports/${id}/resolve`, { resolution });
    return response.data;
  },

  deleteReport: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/api/admin/reports/${id}`);
    return response.data;
  },
};
