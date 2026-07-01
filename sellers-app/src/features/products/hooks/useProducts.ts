import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../api/productApi';

export function useProducts() {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await productApi.getProducts();
      return res.products;
    },
  });

  const lowStockQuery = useQuery({
    queryKey: ['products-low-stock'],
    queryFn: async () => {
      const res = await productApi.getLowStockProducts();
      return res.products;
    },
  });

  const createMutation = useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-low-stock'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof productApi.updateProduct>[1] }) =>
      productApi.updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-low-stock'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-low-stock'] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: productApi.restoreProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-low-stock'] });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) => productApi.updateStock(id, stock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-low-stock'] });
    },
  });

  return {
    products: productsQuery.data ?? [],
    isLoading: productsQuery.isLoading,
    isError: productsQuery.isError,
    refetch: productsQuery.refetch,

    lowStockProducts: lowStockQuery.data ?? [],
    isLoadingLowStock: lowStockQuery.isLoading,

    createProduct: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateProduct: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteProduct: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    restoreProduct: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,

    updateStock: updateStockMutation.mutateAsync,
    isUpdatingStock: updateStockMutation.isPending,
  };
}
