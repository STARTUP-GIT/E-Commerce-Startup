import axiosInstance from '@/lib/axios/axiosInstance';

export interface Review {
  id: string;
  customerId: string;
  productId: string;
  orderItemId: string;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: string;
  isPublished: boolean;
  customer?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

export interface AddReviewPayload {
  productId: string;
  orderItemId: string;
  rating: number;
  title?: string;
  comment?: string;
}

export interface EditReviewPayload {
  rating?: number;
  title?: string;
  comment?: string;
}

export const reviewApi = {
  getProductReviews: async (productId: string): Promise<{ count: number; reviews: Review[] }> => {
    const response = await axiosInstance.get(`/api/reviews/product/${productId}`);
    return response.data;
  },
  addReview: async (payload: AddReviewPayload): Promise<{ message: string; review: Review }> => {
    const response = await axiosInstance.post('/api/reviews', payload);
    return response.data;
  },
  editReview: async (reviewId: string, payload: EditReviewPayload): Promise<{ message: string; review: Review }> => {
    const response = await axiosInstance.patch(`/api/reviews/${reviewId}`, payload);
    return response.data;
  },
  deleteReview: async (reviewId: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/api/reviews/${reviewId}`);
    return response.data;
  },
};
