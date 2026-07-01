import { z } from 'zod';

export const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const signupService = {
  validateInput: (data: unknown) => {
    return signupSchema.safeParse(data);
  },
  formatError: (error: any): string => {
    return error?.message || 'Registration failed. Please try again.';
  },
};
