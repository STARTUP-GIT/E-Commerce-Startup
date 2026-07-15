import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cartApi';
import { useSession } from 'next-auth/react';

export function useCart() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.getCart(),
    enabled: !!session,
  });

  const addToCartMutation = useMutation({
    mutationFn: ({ productId, quantity, variantId }: { productId: string; quantity: number; variantId?: string }) =>
      cartApi.addToCart(productId, quantity, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      cartApi.updateQuantity(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: () => cartApi.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const moveToWishlistMutation = useMutation({
    mutationFn: (itemId: string) => cartApi.moveToWishlist(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  return {
    cart: cartQuery.data?.cart,
    isLoading: cartQuery.isLoading,
    isError: cartQuery.isError,
    refetch: cartQuery.refetch,

    addToCart: addToCartMutation.mutate,
    isAdding: addToCartMutation.isPending,
    addError: addToCartMutation.error,

    updateQuantity: updateQuantityMutation.mutate,
    isUpdating: updateQuantityMutation.isPending,

    removeItem: removeItemMutation.mutate,
    isRemoving: removeItemMutation.isPending,

    clearCart: clearCartMutation.mutate,
    isClearing: clearCartMutation.isPending,

    moveToWishlist: moveToWishlistMutation.mutate,
    isMovingToWishlist: moveToWishlistMutation.isPending,
  };
}
