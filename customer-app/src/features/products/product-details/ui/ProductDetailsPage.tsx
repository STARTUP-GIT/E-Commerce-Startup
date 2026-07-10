'use client';

import React, { useState } from 'react';
import { useProductDetails } from '../hooks/useProductDetails';
import { useCart } from '@/features/cart/hooks/useCart';
import { useWishlist } from '@/features/wishlist/hooks/useWishlist';
import { productDetailsService } from '../services/productDetailsService';
import { productListService } from '../../product-list/services/productListService';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { Card, CardContent } from '@/shared/components/Card';
import { ShoppingCart, Heart, Star, Store, Package, Check, ArrowLeft, Send, Zap, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useConfirmStore } from '@/lib/store/confirmStore';

export function ProductDetailsPage({ productId }: { productId: string }) {
  const { product, reviews, isLoading, isError } = useProductDetails(productId);
  const { addToCart, isAdding } = useCart();
  const { wishlist, addToWishlist } = useWishlist();
  const showAlert = useConfirmStore((state) => state.showAlert);
  const router = useRouter();

  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // For inline review posting simulation
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviewPosted, setReviewPosted] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <Skeleton className="h-6 w-1/4" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="h-[400px] w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 text-center space-y-4">
        <p className="text-destructive font-semibold">Failed to load product details.</p>
        <Link href="/products">
          <Button>Back to Products</Button>
        </Link>
      </div>
    );
  }

  // Calculate rating details
  const averageRating = productDetailsService.calculateAverageRating(reviews);
  const starBreakdown = productDetailsService.getStarBreakdown(reviews);

  // Variant details calculation
  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const finalPrice = Number(product.price) + (selectedVariant ? Number(selectedVariant.priceDifference) : 0);
  const stockAvailable = selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity;
  const isWishlisted = wishlist?.items?.some((item) => item.productId === product.id) || false;

  const handleAddToCart = () => {
    addToCart(
      {
        productId: product.id,
        quantity,
        variantId: selectedVariantId || undefined,
      },
      {
        onSuccess: () => {
          showAlert({ title: 'Added to Cart', message: 'Item was successfully added to your cart!' });
        },
      }
    );
  };

  const handleBuyNow = () => {
    router.push(
      `/checkout?buyNow=true&productId=${product.id}&quantity=${quantity}${
        selectedVariantId ? `&variantId=${selectedVariantId}` : ''
      }`
    );
  };

  const handleWishlistToggle = () => {
    addToWishlist(product.id, {
      onSuccess: () => {
        showAlert({
          title: 'Wishlist Update',
          message: isWishlisted ? 'Removed from wishlist!' : 'Added to wishlist!',
        });
      },
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-12">
      {/* Breadcrumbs / Back button */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
        <Link href="/products" className="hover:text-foreground flex items-center gap-1 shrink-0">
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Back</span>
          <span className="xs:hidden">Back</span>
        </Link>
        <span className="shrink-0">/</span>
        <span className="text-foreground font-medium truncate min-w-0">{product.name}</span>
      </div>

      {/* Main Details layout */}
      <div className="grid md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-start">
        {/* Left Column: Image Gallery */}
        <div className="space-y-3 sm:space-y-4">
          <div className="aspect-square bg-zinc-900 border border-border rounded-xl sm:rounded-2xl overflow-hidden flex items-center justify-center relative">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground" />
            )}
            {stockAvailable <= 0 && (
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-red-500 text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider">
                Out of Stock
              </span>
            )}
          </div>

          {/* Miniature image gallery row */}
          {product.images && product.images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              {product.images.map((img) => (
                <div
                  key={img.id}
                  className="aspect-square bg-zinc-800 rounded-lg overflow-hidden border border-border cursor-pointer hover:opacity-80"
                >
                  <img src={img.url} alt="product thumbnail" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Specifications */}
        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            {product.category && (
              <Badge variant="secondary" className="max-w-fit text-[10px] sm:text-xs">
                {product.category.name}
              </Badge>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground break-words">
              {product.name}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1 flex-wrap">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 ${
                      i < Math.round(averageRating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-zinc-600'
                    }`}
                  />
                ))}
                <span className="text-xs sm:text-sm font-semibold text-foreground ml-1">
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">({reviews.length} reviews)</span>
              </div>

              {product.seller?.shop && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Link
                    href={`/shops/${product.seller.shop.slug || product.seller.shop.id}`}
                    className="flex items-center gap-1.5 text-[11px] sm:text-xs text-primary font-semibold hover:underline"
                  >
                    <Store className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="truncate max-w-[180px] sm:max-w-none">Visit Shop: {product.seller.shop.name}</span>
                  </Link>
                  <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                    • <Truck className="h-3.5 w-3.5" />
                    <span>{product.seller.shop.deliveryMode === 'SELF' ? 'Delivered by Seller' : 'Delivered by Aura'}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-b border-border py-3 sm:py-4 flex items-center justify-between gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {productListService.formatPrice(finalPrice)}
            </span>
            <div className="text-right shrink-0">
              <span
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                  stockAvailable > 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {stockAvailable > 0 ? `In Stock (${stockAvailable})` : 'Out of stock'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-[11px] sm:text-sm font-semibold text-muted-foreground uppercase">Description</h4>
            <p className="text-xs sm:text-sm text-foreground leading-relaxed">{product.description}</p>
          </div>

          {/* Variants Select */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h4 className="text-[11px] sm:text-sm font-semibold text-muted-foreground uppercase">Select Option</h4>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id === selectedVariantId ? null : v.id)}
                    className={`flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold cursor-pointer transition-all ${
                      v.id === selectedVariantId
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{v.name}</span>
                    {v.priceDifference !== 0 && (
                      <span className="text-[9px] sm:text-[10px] opacity-80">
                        {v.priceDifference > 0 ? '+' : ''}
                        {productListService.formatPrice(v.priceDifference)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attributes */}
          {product.attributes && product.attributes.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h4 className="text-[11px] sm:text-sm font-semibold text-muted-foreground uppercase">Specifications</h4>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 bg-zinc-950/40 p-3 sm:p-4 rounded-xl border border-border">
                {product.attributes.map((attr) => (
                  <div key={attr.id} className="text-[11px] sm:text-xs">
                    <span className="font-semibold text-muted-foreground block uppercase text-[9px] sm:text-[10px]">
                      {attr.name}
                    </span>
                    <span className="text-foreground font-medium break-words">{attr.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buy actions */}
          <div className="flex flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 pt-3 sm:pt-4">
            <div className="flex items-center border border-border rounded-lg bg-zinc-950/20 overflow-hidden h-10 sm:h-11">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-2.5 sm:px-3 h-full hover:bg-accent text-sm font-bold cursor-pointer"
                disabled={stockAvailable <= 0}
              >
                -
              </button>
              <span className="px-3 sm:px-4 text-sm font-bold text-foreground min-w-[2ch] text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(stockAvailable, q + 1))}
                className="px-2.5 sm:px-3 h-full hover:bg-accent text-sm font-bold cursor-pointer"
                disabled={stockAvailable <= 0}
              >
                +
              </button>
            </div>

            <Button
              onClick={handleAddToCart}
              isLoading={isAdding}
              disabled={stockAvailable <= 0}
              className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-5 text-xs sm:text-sm cursor-pointer"
            >
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="xs:inline">Cart</span>
            </Button>

            <Button
              onClick={handleBuyNow}
              disabled={stockAvailable <= 0}
              className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-5 text-xs sm:text-sm cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold"
            >
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Buy
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleWishlistToggle}
              className="h-10 sm:h-11 w-10 sm:w-11 flex items-center justify-center cursor-pointer border-border hover:text-red-500 shrink-0"
            >
              <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Product Reviews section */}
      <div className="border-t border-border pt-8 sm:pt-12 space-y-6 sm:space-y-8">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight">Customer Reviews</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Read reviews left by other marketplace buyers.</p>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-6 sm:gap-8 lg:gap-12 items-start">
          {/* Review aggregates */}
          <div className="bg-card border border-border p-4 sm:p-6 rounded-xl sm:rounded-2xl space-y-4 sm:space-y-6">
            <div className="text-center space-y-2">
              <span className="text-3xl sm:text-5xl font-extrabold text-foreground">{averageRating.toFixed(1)}</span>
              <div className="flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${
                      i < Math.round(averageRating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-zinc-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Based on {reviews.length} reviews</p>
            </div>

            {/* Star progress bars */}
            <div className="space-y-1.5 sm:space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
                  <span className="font-semibold text-muted-foreground w-3 shrink-0">{star}★</span>
                  <div className="flex-1 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${starBreakdown[star]}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-7 sm:w-8 text-right shrink-0">
                    {starBreakdown[star]}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews list & Write Review */}
          <div className="space-y-6 sm:space-y-8">
            {/* Reviews display */}
            <div className="space-y-3 sm:space-y-4">
              {reviews.length > 0 ? (
                reviews.map((rev) => (
                  <Card key={rev.id}>
                    <CardContent className="p-4 sm:p-6 space-y-2">
                      <div className="flex items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-xs sm:text-sm truncate">
                            {rev.customer
                              ? `${rev.customer.firstName} ${rev.customer.lastName || ''}`.trim()
                              : 'Anonymous buyer'}
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                              i < rev.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs sm:text-sm text-foreground leading-relaxed pt-1">
                        {rev.comment || 'No written comment left.'}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 sm:py-12 border border-dashed border-border rounded-xl">
                  <Star className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground opacity-50 mb-3" />
                  <p className="text-xs sm:text-sm text-muted-foreground">No reviews posted yet. Be the first to review!</p>
                </div>
              )}
            </div>

            {/* Simulated Add Review */}
            <div className="bg-zinc-950/20 border border-border p-4 sm:p-6 rounded-xl sm:rounded-2xl space-y-3 sm:space-y-4">
              <h4 className="font-bold text-sm sm:text-base">Write a Review</h4>
              {reviewPosted ? (
                <div className="p-3 sm:p-4 text-[11px] sm:text-xs font-semibold text-emerald-500 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Your review has been submitted successfully!
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span className="text-xs sm:text-sm font-semibold">Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className="p-0.5 sm:p-1 cursor-pointer text-yellow-400 hover:scale-110 transition-transform"
                        >
                          <Star className={`h-4 w-4 sm:h-5 sm:w-5 ${star <= newRating ? 'fill-yellow-400' : 'text-zinc-600'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Comment</label>
                    <textarea
                      placeholder="Share your experience using this product..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  <Button
                    onClick={() => {
                      if (!newComment.trim()) {
                        showAlert({ title: 'Validation Error', message: 'Please write a comment before submitting.' });
                        return;
                      }
                      setReviewPosted(true);
                    }}
                    className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Submit Review
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
