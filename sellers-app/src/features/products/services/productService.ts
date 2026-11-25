import { z } from 'zod';

export const createProductSchema = z.object({
  productname: z.string().min(3, 'Product name must be at least 3 characters'),
  fulfilmentType: z.enum(['READY_TO_SHIP', 'MADE_TO_ORDER']),
  productquantity: z.number().int(),
  productprice: z.number().positive('Price must be greater than 0'),
  imageKey: z.string().min(1, 'Please upload a product image'),
  categoryId: z.string().optional(),
  minPrepDays: z.number().int().optional().nullable(),
  maxPrepDays: z.number().int().optional().nullable(),
  prepTimeType: z.enum(['BUSINESS_DAYS', 'CALENDAR_DAYS']).optional(),
  productionNotes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  maxConcurrentOrders: z.number().int().positive().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.fulfilmentType === 'READY_TO_SHIP') {
    if (data.productquantity === undefined || data.productquantity < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Stock quantity is required and must be at least 1 unit for Ready to Ship items',
        path: ['productquantity'],
      });
    }
  } else if (data.fulfilmentType === 'MADE_TO_ORDER') {
    if (data.minPrepDays === undefined || data.minPrepDays === null || data.minPrepDays < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum preparation days must be at least 1 day',
        path: ['minPrepDays'],
      });
    }
    if (data.maxPrepDays === undefined || data.maxPrepDays === null || (data.minPrepDays && data.maxPrepDays < data.minPrepDays)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maximum preparation days must be greater than or equal to minimum days',
        path: ['maxPrepDays'],
      });
    }
  }
});

export const editProductSchema = z.object({
  fulfilmentType: z.enum(['READY_TO_SHIP', 'MADE_TO_ORDER']),
  productquantity: z.number().int(),
  productprice: z.number().positive('Price must be greater than 0'),
  imageKey: z.string().min(1, 'Please upload a product image'),
  categoryId: z.string().optional(),
  minPrepDays: z.number().int().optional().nullable(),
  maxPrepDays: z.number().int().optional().nullable(),
  prepTimeType: z.enum(['BUSINESS_DAYS', 'CALENDAR_DAYS']).optional(),
  productionNotes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  maxConcurrentOrders: z.number().int().positive().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.fulfilmentType === 'READY_TO_SHIP') {
    if (data.productquantity === undefined || data.productquantity < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Stock quantity cannot be negative',
        path: ['productquantity'],
      });
    }
  } else if (data.fulfilmentType === 'MADE_TO_ORDER') {
    if (data.minPrepDays === undefined || data.minPrepDays === null || data.minPrepDays < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum preparation days must be at least 1 day',
        path: ['minPrepDays'],
      });
    }
    if (data.maxPrepDays === undefined || data.maxPrepDays === null || (data.minPrepDays && data.maxPrepDays < data.minPrepDays)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maximum preparation days must be greater than or equal to minimum days',
        path: ['maxPrepDays'],
      });
    }
  }
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type EditProductInput = z.infer<typeof editProductSchema>;

export const productService = {
  validateCreate: (data: unknown) => {
    return createProductSchema.safeParse(data);
  },
  validateEdit: (data: unknown) => {
    return editProductSchema.safeParse(data);
  },
  formatPrice: (price: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(price);
  },
  formatPrepTime: (min?: number | null, max?: number | null, type?: string | null): string => {
    if (!min && !max) return 'Ships in 24 hours';
    const dayType = type === 'CALENDAR_DAYS' ? 'cal days' : 'business days';
    if (min === max || !min) return `${max} ${dayType}`;
    return `${min}-${max} ${dayType}`;
  },
};
