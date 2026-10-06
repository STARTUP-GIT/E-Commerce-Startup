import axiosInstance from '@/lib/axios/axiosInstance';

export const CONTENT_PLACEMENTS = [
  'HOME_HERO',
  'HOME_BANNER',
  'HOME_STRIP',
  'CATEGORY_PROMO',
  'STORE_PROMO',
  'ANNOUNCEMENT',
  'FOOTER',
  'OTHER',
] as const;

export const CONTENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

export type ContentPlacement = (typeof CONTENT_PLACEMENTS)[number];
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export interface ContentBlock {
  id: string;
  title: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  imagePublicId?: string | null;
  linkUrl?: string;
  placement: ContentPlacement;
  status: ContentStatus;
  sortOrder: number;
  visibleFrom?: string | null;
  visibleTo?: string | null;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContentBlockPayload {
  title: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  linkUrl?: string;
  placement: ContentPlacement;
  status: ContentStatus;
  sortOrder: number;
  visibleFrom?: string | null;
  visibleTo?: string | null;
}

export interface ContentPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ContentListParams {
  placement?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const contentApi = {
  getBlocks: async (params: ContentListParams) => {
    const response = await axiosInstance.get('/api/admin/content', { params });
    return response.data as { blocks: ContentBlock[]; pagination: ContentPagination };
  },
  createBlock: async (payload: ContentBlockPayload) => {
    const response = await axiosInstance.post('/api/admin/content', payload);
    return response.data as { block: ContentBlock };
  },
  updateBlock: async (id: string, payload: Partial<ContentBlockPayload>) => {
    const response = await axiosInstance.patch(`/api/admin/content/${id}`, payload);
    return response.data as { block: ContentBlock };
  },
  updateBlockStatus: async (id: string, status: ContentStatus) => {
    const response = await axiosInstance.patch(`/api/admin/content/${id}/status`, { status });
    return response.data as { block: ContentBlock };
  },
  deleteBlock: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/content/${id}`);
    return response.data as { message: string };
  },
};