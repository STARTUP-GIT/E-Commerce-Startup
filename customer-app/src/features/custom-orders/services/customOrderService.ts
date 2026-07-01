import { z } from 'zod';

export const customOrderFileSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().url('File URL must be a valid URL'),
  fileType: z.enum(['STL', 'STEP', 'OBJ', 'PDF', 'IMAGE', 'OTHER']),
  fileSizeBytes: z.number().positive('File size must be positive'),
});

export const customOrderSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  material: z.string().min(1, 'Material selection is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  shippingAddressId: z.string().min(1, 'Shipping address is required'),
  files: z.array(customOrderFileSchema).min(1, 'At least one file attachment is required'),
});

export type CustomOrderInput = z.infer<typeof customOrderSchema>;

export const customOrderService = {
  validateInput: (data: unknown) => {
    return customOrderSchema.safeParse(data);
  },
  getStatusBadgeVariant: (status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' => {
    switch (status.toUpperCase()) {
      case 'ACCEPTED':
      case 'QUOTED':
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
      case 'UNDER_REVIEW':
        return 'default';
      case 'CANCELLED':
      case 'REJECTED':
      case 'EXPIRED':
        return 'destructive';
      default:
        return 'outline';
    }
  },
  formatStatus: (status: string): string => {
    return status.replace(/_/g, ' ').toUpperCase();
  },
  getFileIconName: (fileType: string): string => {
    switch (fileType.toUpperCase()) {
      case 'STL':
      case 'STEP':
      case 'OBJ':
        return 'Box';
      case 'PDF':
        return 'FileText';
      case 'IMAGE':
        return 'Image';
      default:
        return 'Paperclip';
    }
  },
};
