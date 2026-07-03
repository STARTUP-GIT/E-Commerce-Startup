import { z } from 'zod';

export const createProductSchema = z.object({
  productname: z.string().min(3, 'Product name must be at least 3 characters'),
  productquantity: z.number().int().min(1, 'Quantity must be at least 1'),
  productprice: z.number().positive('Price must be greater than 0'),
  imageKey: z.string().min(1, 'Please upload a product image'),
});

export const editProductSchema = z.object({
  productquantity: z.number().int().min(1, 'Quantity must be at least 1'),
  productprice: z.number().positive('Price must be greater than 0'),
  imageKey: z.string().min(1, 'Please upload a product image'),
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
};
