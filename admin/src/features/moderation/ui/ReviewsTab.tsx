"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, REVIEW_PUBLISHED_FILTERS, type ReviewItem } from '../api/moderationApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { EyeOff, RotateCcw, Trash2, Star, CheckCircle } from 'lucide-react';

function reviewerOf(review: ReviewItem): string {
  if (!review.customer) return '—';
  return review.customer.username || review.customer.email || review.customer.id;
}

export function ReviewsTab() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const showConfirm = useConfirmStore((state) => state.showConfirm);
  const { can } = usePermissions();

  const canManage = can('moderation.manage');
  const [publishedFilter, setPublishedFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['moderation', 'reviews', { published: publishedFilter, page }],
    queryFn: () =>
      moderationApi.getReviews({
        published: publishedFilter || undefined,
        page,
        limit: 20,
      }),
    staleTime: 30 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['moderation', 'reviews'] });

  const hideMutation = useMutation({
    mutationFn: (id: string) => moderationApi.hideReview(id),
    onSuccess: () => { invalidate(); showToast('Review hidden.', 'info'); },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => moderationApi.restoreReview(id),
    onSuccess: () => { invalidate(); showToast('Review restored.', 'success'); },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => moderationApi.deleteReview(id),
    onSuccess: () => { invalidate(); showToast('Review deleted.', 'info'); },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const reviews = data?.reviews ?? [];
  const pagination = data?.pagination;
  const actionPending =
    hideMutation.isPending || restoreMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="border border-white/5 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <select
            value={publishedFilter}
            onChange={(e) => { setPublishedFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-lg border border-white/10 bg-[#0c0c10] text-xs font-semibold text-white/80 focus:outline-none focus:border-white/30 cursor-pointer"
          >
            {REVIEW_PUBLISHED_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <div className="text-xs text-white/40 font-semibold">
            {pagination?.total ?? reviews.length} reviews
          </div>
        </div>
      </Card>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Product Reviews</CardTitle>
          <CardDescription>Hide, restore or permanently remove customer reviews</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : isError ? (
            <div className="text-center py-16 text-red-400 text-sm">{error?.message || 'Failed to load reviews'}</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <CheckCircle className="h-8 w-8 text-emerald-400/40 mx-auto" />
              <p className="text-xs text-white/30 font-medium">No reviews found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rating</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-white/15'}`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-white/50">{review.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-white/70 max-w-[180px] truncate">
                      {review.product?.name || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-white/50 max-w-[140px] truncate">
                      {review.shop?.name || review.product?.shop?.name || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-white/60 max-w-[140px] truncate">
                      {reviewerOf(review)}
                    </TableCell>
                    <TableCell className="text-xs text-white/60 max-w-[240px] truncate" title={review.comment || ''}>
                      {review.comment || review.title || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={review.isPublished ? 'success' : 'secondary'} className="text-[8px]">
                        {review.isPublished ? 'Published' : 'Hidden'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/40">
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {review.isPublished ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-orange-400 hover:bg-orange-500/10 text-[9px]"
                            disabled={!canManage}
                            isLoading={hideMutation.isPending}
                            onClick={() => hideMutation.mutate(review.id)}
                          >
                            <EyeOff className="h-3.5 w-3.5 mr-1" /> Hide
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10 text-[9px]"
                            disabled={!canManage}
                            isLoading={restoreMutation.isPending}
                            onClick={() => restoreMutation.mutate(review.id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-400 hover:bg-red-500/10"
                          disabled={!canManage || actionPending}
                          onClick={() => {
                            showConfirm({
                              title: 'Delete Review',
                              message: `This permanently deletes the ${review.rating}-star review on "${review.product?.name || 'this product'}". This cannot be undone.`,
                              confirmText: 'Delete Review',
                              onConfirm: () => deleteMutation.mutate(review.id),
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-xs text-white/40">Page {pagination.page} of {pagination.pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.pages}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
