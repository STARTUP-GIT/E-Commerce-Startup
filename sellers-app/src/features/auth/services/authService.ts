import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const authService = {
  validateLogin: (data: unknown) => {
    return loginSchema.safeParse(data);
  },
  validateRegister: (data: unknown) => {
    return registerSchema.safeParse(data);
  },
  formatError: (error: any): string => {
    return error?.message || 'Authentication operation failed. Please try again.';
  },
};
