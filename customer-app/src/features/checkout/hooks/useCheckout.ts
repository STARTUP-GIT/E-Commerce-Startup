import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkoutApi, BuyNowParams } from '../api/checkoutApi';
import { useState } from 'react';

export function useCheckout(buyNow?: BuyNowParams) {
  const queryClient = useQueryClient();
  const [couponCode, setCouponCode] = useState<string>('');

  const summaryQuery = useQuery({
    queryKey: ['checkout-summary', couponCode, buyNow],
    queryFn: () => checkoutApi.getSummary(couponCode || undefined, buyNow),
  });

  const validateQuery = useQuery({
    queryKey: ['checkout-validation', buyNow],
    queryFn: () => checkoutApi.validateCheckout(buyNow),
    retry: false,
  });

  const applyCouponMutation = useMutation({
    mutationFn: (code: string) => checkoutApi.applyCoupon(code, buyNow),
    onSuccess: (data) => {
      setCouponCode(data.coupon.code);
      queryClient.invalidateQueries({ queryKey: ['checkout-summary'] });
    },
  });

  const removeCouponMutation = useMutation({
    mutationFn: (code: string) => checkoutApi.removeCoupon(code, buyNow),
    onSuccess: () => {
      setCouponCode('');
      queryClient.invalidateQueries({ queryKey: ['checkout-summary'] });
    },
  });

  return {
    summary: summaryQuery.data?.checkoutSummary,
    isLoading: summaryQuery.isLoading || validateQuery.isLoading,
    isError: summaryQuery.isError,
    validation: validateQuery.data,
    validationError: validateQuery.error,

    couponCode,
    applyCoupon: applyCouponMutation.mutate,
    isApplyingCoupon: applyCouponMutation.isPending,
    applyCouponError: applyCouponMutation.error,

    removeCoupon: removeCouponMutation.mutate,
    isRemovingCoupon: removeCouponMutation.isPending,
  };
}
