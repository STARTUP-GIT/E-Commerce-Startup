import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const loginService = {
  validateInput: (data: unknown) => {
    return loginSchema.safeParse(data);
  },
  formatError: (error: any): string => {
    return error?.message || 'Login failed. Please verify your credentials and try again.';
  },
};
