import axiosInstance from '@/lib/axios/axiosInstance';

/**
 * Members of `ReturnStatus` from backend/prisma/enums/return-status.prisma.
 */
export const RETURN_STATUSES = [
  'REQUESTED',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'RECEIVED_BY_SELLER',
  'REFUND_PROCESSING',
  'REFUNDED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type ReturnStatusValue = (typeof RETURN_STATUSES)[number];

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning';

export const RETURN_STATUS_VARIANT: Record<ReturnStatusValue, BadgeVariant> = {
  REQUESTED: 'default',
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  PICKUP_SCHEDULED: 'secondary',
  PICKED_UP: 'secondary',
  RECEIVED_BY_SELLER: 'secondary',
  REFUND_PROCESSING: 'warning',
  REFUNDED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'outline',
};

/** Statuses the backend (409) refuses to approve/reject again. */
export const TERMINAL_RETURN_STATUSES: ReturnStatusValue[] = [
  'REJECTED',
  'CANCELLED',
  'REFUNDED',
  'COMPLETED',
];

export interface ReturnOrder {
  id: string;
  orderNumber?: string | null;
  status?: string | null;
  createdAt?: string;
}

export interface ReturnCustomer {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}

export interface ReturnProduct {
  id: string;
  name?: string | null;
  imageUrl?: string | null;
  slug?: string | null;
}

export interface ReturnSeller {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export interface ReturnAdmin {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export interface ReturnItem {
  id: string;
  returnNumber: string;
  orderId: string;
  orderItemId: string;
  customerId: string;
  sellerId: string;
  productId: string;
  status: ReturnStatusValue | string;
  reason: string;
  description?: string | null;
  refundAmount: number | string;
  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  order?: ReturnOrder | null;
  customer?: ReturnCustomer | null;
  product?: ReturnProduct | null;
  seller?: ReturnSeller | null;
  reviewedByAdmin?: ReturnAdmin | null;
}

export interface ReturnPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ReturnListResponse {
  returns: ReturnItem[];
  pagination: ReturnPagination;
}

export interface ReturnMutationResponse {
  returnRequest: ReturnItem;
}

export interface ReturnListParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const returnApi = {
  getReturns: async (params?: ReturnListParams): Promise<ReturnListResponse> => {
    const response = await axiosInstance.get('/api/admin/returns', { params });
    return response.data;
  },

  approveReturn: async (id: string, adminNotes?: string): Promise<ReturnMutationResponse> => {
    const response = await axiosInstance.post(`/api/admin/returns/${id}/approve`, {
      ...(adminNotes ? { adminNotes } : {}),
    });
    return response.data;
  },

  rejectReturn: async (id: string, rejectionReason: string): Promise<ReturnMutationResponse> => {
    const response = await axiosInstance.post(`/api/admin/returns/${id}/reject`, { rejectionReason });
    return response.data;
  },
};
