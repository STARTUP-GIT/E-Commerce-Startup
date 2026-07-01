'use client';

import React, { useState, useEffect } from 'react';
import { useReviews } from '../hooks/useReviews';
import { customOrderService } from '../../custom-orders/services/customOrderService';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Star, X, AlertCircle } from 'lucide-react';

interface ReviewFormModalProps {
  productId: string;
  productName: string;
  orderItemId: string;
  isOpen: boolean;
  onClose: () => void;
  existingReview?: {
    id: string;
    rating: number;
    title?: string;
    comment?: string;
  } | null;
}

export function ReviewFormModal({
  productId,
  productName,
  orderItemId,
  isOpen,
  onClose,
  existingReview
}: ReviewFormModalProps) {
  const { addReview, editReview, isAddingReview, isEditingReview } = useReviews(productId);

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setTitle(existingReview.title || '');
      setComment(existingReview.comment || '');
    } else {
      setRating(5);
      setTitle('');
      setComment('');
    }
    setError(null);
  }, [existingReview, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5 stars');
      return;
    }

    try {
      if (existingReview) {
        await editReview({
          reviewId: existingReview.id,
          payload: {
            rating,
            title: title.trim() || undefined,
            comment: comment.trim() || undefined,
          },
        });
      } else {
        await addReview({
          productId,
          orderItemId,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-zinc-900 border border-border rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/80">
          <h3 className="text-base font-bold text-foreground">
            {existingReview ? 'Update Review' : 'Write a Product Review'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-foreground rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Sharing your experience helps other customers make better choices. Reviewing for:{' '}
            <span className="font-semibold text-foreground">{productName}</span>
          </p>

          {error && (
            <div className="p-3 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Stars Selection */}
          <div className="space-y-1.5 flex flex-col items-center py-2 bg-zinc-950/20 border border-border/50 rounded-xl">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Your Rating *</span>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const active = hoverRating !== null ? starValue <= hoverRating : starValue <= rating;
                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 text-zinc-600 hover:text-yellow-400 transition-colors cursor-pointer"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        active ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Review Title</label>
            <Input
              placeholder="e.g. Excellent print quality, very durable"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Comment textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Review details</label>
            <textarea
              placeholder="Tell others what you liked or disliked about this product."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full min-h-[80px] p-3 text-sm text-foreground bg-zinc-950/50 border border-border rounded-xl focus:outline-none focus:border-primary placeholder-zinc-500 transition-all resize-y"
            />
          </div>

          {/* Actions */}
          <div className="border-t border-border/80 pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer border-border">
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={existingReview ? isEditingReview : isAddingReview}
              className="cursor-pointer"
            >
              Submit Review
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
