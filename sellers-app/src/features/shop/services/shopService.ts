import { z } from 'zod';

export const shopSetupSchema = z.object({
  shopName: z.string().min(3, 'Shop name must be at least 3 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  addressLine1: z.string().min(5, 'Address is too short'),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().min(1, 'State/Province is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
});

export const getShopSetupSchema = (districtRequired: boolean) => z.object({
  shopName: z.string().min(3, 'Shop name must be at least 3 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  addressLine1: z.string().min(5, 'Address is too short'),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().min(1, 'State selection is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
}).refine((data) => {
  if (districtRequired) {
    return typeof data.city === 'string' && data.city.trim().length > 0;
  }
  return true;
}, {
  message: 'District selection is required',
  path: ['city']
});

export const bankDetailsSchema = z.object({
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(8, 'Please enter a valid account number'),
  ifscCode: z.string().min(4, 'IFSC code is required'),
  upiId: z.string().optional(),
});

export const appealSchema = z.object({
  subject: z.string().min(5, 'Subject is required'),
  description: z.string().min(15, 'Please detail your appeal reason (min 15 chars)'),
});

export type ShopSetupInput = z.infer<typeof shopSetupSchema>;
export type BankDetailsInput = z.infer<typeof bankDetailsSchema>;
export type AppealInput = z.infer<typeof appealSchema>;

export const shopService = {
  validateShopSetup: (data: unknown) => {
    return shopSetupSchema.safeParse(data);
  },
  validateBankDetails: (data: unknown) => {
    return bankDetailsSchema.safeParse(data);
  },
  validateAppeal: (data: unknown) => {
    return appealSchema.safeParse(data);
  },
  getApprovalStatusColor: (status?: string): 'default' | 'success' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'default';
      case 'REJECTED':
        return 'destructive';
      default:
        return 'secondary';
    }
  },
};
