import { z } from 'zod';

export const rejectOrderSchema = z.object({
  reason: z.string().min(5, 'Rejection reason must be at least 5 characters'),
});

export const readyTimeSchema = z.object({
  readyByAt: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d > new Date();
  }, 'Estimated ready time must be in the future'),
});

export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;
export type ReadyTimeInput = z.infer<typeof readyTimeSchema>;

export const ordersService = {
  validateReject: (data: unknown) => {
    return rejectOrderSchema.safeParse(data);
  },
  validateReadyTime: (data: unknown) => {
    return readyTimeSchema.safeParse(data);
  },
  getStatusColor: (status: string): 'default' | 'success' | 'destructive' | 'secondary' | 'outline' => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'default';
      case 'ACCEPTED':
      case 'PROCESSING':
        return 'secondary';
      case 'PACKED':
        return 'outline';
      case 'SHIPPED':
        return 'success'; // or default
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'outline';
    }
  },
  formatDate: (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },
};
