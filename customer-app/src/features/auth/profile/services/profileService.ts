import { z } from 'zod';

export const editProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  phone: z.string().optional(),
});

export const getAddAddressSchema = (districtRequired: boolean) => z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  addressLine1: z.string().min(1, 'Address Line 1 is required'),
  addressLine2: z.string().optional(),
  city: districtRequired ? z.string().min(1, 'District is required') : z.string().optional(),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  type: z.enum(['HOME', 'WORK', 'BILLING', 'SHIPPING', 'OTHER']),
  label: z.string().optional(),
  isDefault: z.boolean(),
});

export type EditProfileInput = z.infer<typeof editProfileSchema>;
export type AddAddressInput = z.infer<ReturnType<typeof getAddAddressSchema>>;

export const profileService = {
  validateEditProfile: (data: unknown) => editProfileSchema.safeParse(data),
  validateAddAddress: (data: unknown, districtRequired = true) => getAddAddressSchema(districtRequired).safeParse(data),
};
