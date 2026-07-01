'use client';

import React from 'react';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '@/features/cart/hooks/useCart';
import { productListService } from '../../products/product-list/services/productListService';
import { Card, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Heart, ShoppingCart, Trash2, Package, Eye } from 'lucide-react';
import Link from 'next/link';

import { useConfirmStore } from '@/lib/store/confirmStore';

export function WishlistPage() {
  const { wishlist, isLoading, isError, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const showAlert = useConfirmStore((state) => state.showAlert);

  const items = wishlist?.items || [];

  const handleAddToCart = (productId: string, wishlistId: string) => {
    addToCart(
      { productId, quantity: 1 },
      {
        onSuccess: () => {
          removeFromWishlist(wishlistId);
          showAlert({ title: 'Success', message: 'Item successfully moved to cart!' });
        },
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header title */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-zinc-400 bg-clip-text text-transparent">
          My Wishlist
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Keep track of items you love and add them to your cart when ready.
        </p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-44 w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-destructive font-semibold">
          Error loading your wishlist. Please try again later.
        </div>
      ) : items.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const prod = item.product;
            const isOutOfStock = prod.stockQuantity <= 0;

            return (
              <Card key={item.id} className="overflow-hidden flex flex-col justify-between border border-border bg-card group">
                <div className="h-44 bg-zinc-800 relative overflow-hidden">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    onClick={() => removeFromWishlist(item.id)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-zinc-950/80 backdrop-blur-md text-red-400 hover:text-red-500 border border-white/10 cursor-pointer"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {isOutOfStock && (
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-red-500/90 text-[10px] font-bold text-white uppercase">
                      Out of stock
                    </span>
                  )}
                </div>

                <CardContent className="p-4 flex flex-col justify-between h-[calc(100%-176px)]">
                  <div className="space-y-1">
                    <h4 className="font-bold text-base line-clamp-1 text-foreground">
                      {prod.name}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {prod.description}
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-extrabold text-foreground">
                        {productListService.formatPrice(prod.price)}
                      </span>
                      <Link href={`/products/${prod.id}`}>
                        <Button variant="ghost" size="sm" className="flex items-center gap-1 cursor-pointer">
                          <Eye className="h-3.5 w-3.5" />
                          View Details
                        </Button>
                      </Link>
                    </div>

                    <Button
                      onClick={() => handleAddToCart(prod.id, item.id)}
                      disabled={isOutOfStock}
                      className="w-full flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl max-w-md mx-auto">
          <Heart className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h4 className="text-base font-bold text-foreground">Your wishlist is empty</h4>
          <p className="text-sm text-muted-foreground mt-1 px-4">
            Tap the heart icon on any product details page to save it here!
          </p>
          <Link href="/products" className="inline-block mt-4">
            <Button className="cursor-pointer">Explore Products</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
