import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistApi } from '../api/wishlistApi';
import { useSession } from 'next-auth/react';

export function useWishlist() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const wishlistQuery = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistApi.getWishlist(),
    enabled: !!session,
  });

  const addToWishlistMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.addToWishlist(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: (itemId: string) => wishlistApi.removeFromWishlist(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const clearWishlistMutation = useMutation({
    mutationFn: () => wishlistApi.clearWishlist(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  return {
    wishlist: wishlistQuery.data?.wishlist,
    isLoading: wishlistQuery.isLoading,
    isError: wishlistQuery.isError,

    addToWishlist: addToWishlistMutation.mutate,
    isAdding: addToWishlistMutation.isPending,

    removeFromWishlist: removeFromWishlistMutation.mutate,
    isRemoving: removeFromWishlistMutation.isPending,

    clearWishlist: clearWishlistMutation.mutate,
    isClearing: clearWishlistMutation.isPending,
  };
}
