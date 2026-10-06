import axiosInstance from '@/lib/axios/axiosInstance';

export const TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
  'WAITING_ON_SELLER',
  'RESOLVED',
  'CLOSED',
] as const;

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning';

export const TICKET_STATUS_VARIANT: Record<TicketStatus, BadgeVariant> = {
  OPEN: 'default',
  IN_PROGRESS: 'warning',
  WAITING_ON_CUSTOMER: 'secondary',
  WAITING_ON_SELLER: 'secondary',
  RESOLVED: 'success',
  CLOSED: 'outline',
};

export const TICKET_PRIORITY_VARIANT: Record<TicketPriority, BadgeVariant> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
};

export interface TicketCustomer {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}

export interface TicketSeller {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  shop?: { id: string; name?: string | null } | null;
}

export interface TicketOrder {
  id: string;
  orderNumber?: string | null;
  status?: string | null;
}

export interface TicketAdmin {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export interface TicketMessage {
  id: string;
  ticketId?: string;
  senderType: string;
  senderId: string;
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber?: string | null;
  subject: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  customerId?: string | null;
  sellerId?: string | null;
  orderId?: string | null;
  assignedToAdminId?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  customer?: TicketCustomer | null;
  seller?: TicketSeller | null;
  order?: TicketOrder | null;
  assignedToAdmin?: TicketAdmin | null;
  _count?: { messages: number };
  messages?: TicketMessage[];
}

export interface TicketPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface TicketListResponse {
  tickets: SupportTicket[];
  pagination: TicketPagination;
}

export interface TicketDetailResponse {
  ticket: SupportTicket;
}

export interface TicketListParams {
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const supportTicketApi = {
  getTickets: async (params?: TicketListParams): Promise<TicketListResponse> => {
    const response = await axiosInstance.get('/api/admin/support-tickets', { params });
    return response.data;
  },

  getTicket: async (id: string): Promise<TicketDetailResponse> => {
    const response = await axiosInstance.get(`/api/admin/support-tickets/${id}`);
    return response.data;
  },

  replyToTicket: async (id: string, message: string): Promise<{ reply: TicketMessage }> => {
    const response = await axiosInstance.post(`/api/admin/support-tickets/${id}/messages`, { message });
    return response.data;
  },

  updateTicket: async (
    id: string,
    payload: { status?: TicketStatus; priority?: TicketPriority }
  ): Promise<TicketDetailResponse> => {
    const response = await axiosInstance.patch(`/api/admin/support-tickets/${id}`, payload);
    return response.data;
  },
};
