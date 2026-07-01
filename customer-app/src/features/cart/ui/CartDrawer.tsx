'use client';

import React from 'react';
import { useCart } from '../hooks/useCart';
import { useUIStore } from '@/lib/store/uiStore';
import { productListService } from '../../products/product-list/services/productListService';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { ShoppingCart, X, Trash2, Heart, Plus, Minus, ArrowRight, Package } from 'lucide-react';
import Link from 'next/link';
import { useProfile } from '@/features/auth/profile/hooks/useProfile';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '@/features/auth/profile/api/profileApi';
import { useLocationStore } from '@/lib/store/locationStore';
import { useConfirmStore } from '@/lib/store/confirmStore';

export function CartDrawer() {
  const cartOpen = useUIStore((state) => state.cartOpen);
  const setCartOpen = useUIStore((state) => state.setCartOpen);

  const {
    cart,
    isLoading,
    updateQuantity,
    removeItem,
    clearCart,
    moveToWishlist,
  } = useCart();

  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const { profile } = useProfile();
  const setComingSoon = useLocationStore((state) => state.setComingSoon);

  const { data: locationsConfig } = useQuery({
    queryKey: ['locations-config'],
    queryFn: profileApi.getLocationsStates,
    staleTime: 10 * 60 * 1000,
    enabled: cartOpen,
  });

  const activeStates = locationsConfig?.states ?? [];
  const defaultAddress = profile?.addresses?.find((a) => a.isDefault) || profile?.addresses?.[0];

  const handleCheckoutClick = (e: React.MouseEvent) => {
    if (defaultAddress && locationsConfig?.allStates) {
      const stateObj = locationsConfig.allStates.find(
        (st: any) => st.name.toLowerCase() === defaultAddress.state.toLowerCase()
      );
      if (stateObj && !stateObj.isEnabled) {
        e.preventDefault();
        setCartOpen(false);
        setComingSoon(true, stateObj.name);
      }
    }
  };

  if (!cartOpen) return null;

  const items = cart?.items || [];
  const subtotal = items.reduce((acc, item) => {
    const basePrice = Number(item.product.price);
    const varDiff = item.variant ? Number(item.variant.priceDifference) : 0;
    return acc + (basePrice + varDiff) * item.quantity;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      {/* Background backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setCartOpen(false)}
      ></div>

      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md transform bg-card border-l border-border text-foreground shadow-2xl transition-all duration-300 ease-in-out">
          <div className="flex h-full flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold tracking-tight">Your Cart</h2>
                {items.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {items.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                onClick={() => setCartOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart Items list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-4 items-center">
                      <Skeleton className="h-16 w-16 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length > 0 ? (
                items.map((item) => {
                  const basePrice = Number(item.product.price);
                  const varDiff = item.variant ? Number(item.variant.priceDifference) : 0;
                  const itemPrice = basePrice + varDiff;

                  return (
                    <div key={item.id} className="flex items-start gap-4 p-4 border border-border bg-zinc-950/20 rounded-xl relative group">
                      {/* Product image */}
                      <div className="h-16 w-16 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-border">
                        {item.product.imageUrl ? (
                          <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>

                      {/* Detail */}
                      <div className="flex-1 space-y-1 pr-6">
                        <h4 className="font-bold text-sm line-clamp-1 text-foreground hover:text-primary">
                          <Link href={`/products/${item.productId}`} onClick={() => setCartOpen(false)}>
                            {item.product.name}
                          </Link>
                        </h4>
                        {item.variant && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                            Option: {item.variant.name}
                          </span>
                        )}
                        <span className="text-sm font-semibold block text-foreground">
                          {productListService.formatPrice(itemPrice)}
                        </span>

                        {/* Increment / Decrement */}
                        <div className="flex items-center gap-2 pt-2">
                          <div className="flex items-center border border-border rounded bg-background overflow-hidden h-7">
                            <button
                              onClick={() => {
                                if (item.quantity > 1) {
                                  updateQuantity({ itemId: item.id, quantity: item.quantity - 1 });
                                }
                              }}
                              className="px-2 h-full hover:bg-accent text-xs font-bold cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-3 text-xs font-bold text-foreground">{item.quantity}</span>
                            <button
                              onClick={() => {
                                updateQuantity({ itemId: item.id, quantity: item.quantity + 1 });
                              }}
                              className="px-2 h-full hover:bg-accent text-xs font-bold cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions (delete/wishlist) */}
                      <div className="absolute top-4 right-4 flex flex-col items-center gap-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-muted-foreground hover:text-red-500 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => moveToWishlist(item.id)}
                          className="p-1 text-muted-foreground hover:text-primary cursor-pointer"
                          title="Move to wishlist"
                        >
                          <Heart className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-20">
                  <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                  <h4 className="text-base font-bold text-foreground">Your cart is empty</h4>
                  <p className="text-sm text-muted-foreground mt-1 px-4">
                    Looks like you haven&apos;t added anything to your cart yet.
                  </p>
                  <Button variant="outline" className="mt-4 cursor-pointer" onClick={() => setCartOpen(false)}>
                    Browse Products
                  </Button>
                </div>
              )}
            </div>

            {/* Footer Summary */}
            {items.length > 0 && (
              <div className="border-t border-border bg-zinc-950/40 p-6 space-y-4">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-lg font-bold text-foreground">
                    {productListService.formatPrice(subtotal)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Shipping and taxes calculated at checkout.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      showConfirm({
                        title: 'Clear Cart',
                        message: 'Are you sure you want to clear your entire cart?',
                        confirmText: 'Clear All',
                        onConfirm: () => {
                          clearCart();
                        },
                      });
                    }}
                    className="cursor-pointer border-border hover:bg-red-500/10 hover:text-red-500"
                  >
                    Clear Cart
                  </Button>
                  <Link
                    href="/checkout"
                    onClick={(e) => {
                      handleCheckoutClick(e);
                      if (!e.defaultPrevented) {
                        setCartOpen(false);
                      }
                    }}
                    className="w-full"
                  >
                    <Button className="w-full flex items-center justify-center gap-2 cursor-pointer">
                      Checkout
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
