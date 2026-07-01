import { z } from 'zod';

export const quotationSchema = z.object({
  quotedPrice: z.number().positive('Price must be greater than 0'),
  estimatedDays: z.number().int().min(1, 'Lead time must be at least 1 day'),
  notes: z.string().optional(),
  validUntil: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d > new Date();
  }, 'Validity period must end in the future'),
});

export type QuotationInput = z.infer<typeof quotationSchema>;

export const customOrderService = {
  validateQuotation: (data: unknown) => {
    return quotationSchema.safeParse(data);
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
  formatSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  getStatusBadgeVariant: (status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' => {
    switch (status.toUpperCase()) {
      case 'UNDER_REVIEW':
        return 'secondary';
      case 'QUOTED':
      case 'ACCEPTED':
        return 'success';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'default';
    }
  },
};
