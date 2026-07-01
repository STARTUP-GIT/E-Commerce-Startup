import { z } from 'zod';

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating must be at least 1 star').max(5, 'Rating cannot exceed 5 stars'),
  title: z.string().max(100, 'Title cannot exceed 100 characters').optional(),
  comment: z.string().max(1000, 'Comment cannot exceed 1000 characters').optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export const reviewService = {
  validateInput: (data: unknown) => {
    return reviewSchema.safeParse(data);
  },
};
