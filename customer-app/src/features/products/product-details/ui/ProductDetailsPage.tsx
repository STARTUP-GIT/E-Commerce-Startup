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
import { ShoppingCart, Heart, Star, Store, Package, Check, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

import { useConfirmStore } from '@/lib/store/confirmStore';

export function ProductDetailsPage({ productId }: { productId: string }) {
  const { product, reviews, isLoading, isError } = useProductDetails(productId);
  const { addToCart, isAdding } = useCart();
  const { wishlist, addToWishlist } = useWishlist();
  const showAlert = useConfirmStore((state) => state.showAlert);

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
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
      {/* Breadcrumbs / Back button */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/products" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
      </div>

      {/* Main Details layout */}
      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* Left Column: Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square bg-zinc-900 border border-border rounded-2xl overflow-hidden flex items-center justify-center relative">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="h-20 w-20 text-muted-foreground" />
            )}
            {stockAvailable <= 0 && (
              <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-red-500 text-xs font-bold text-white uppercase tracking-wider">
                Out of Stock
              </span>
            )}
          </div>

          {/* Miniature image gallery row */}
          {product.images && product.images.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
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
        <div className="space-y-6">
          <div className="space-y-2">
            {product.category && (
              <Badge variant="secondary" className="max-w-fit">
                {product.category.name}
              </Badge>
            )}
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {product.name}
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4.5 w-4.5 ${
                      i < Math.round(averageRating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-zinc-600'
                    }`}
                  />
                ))}
                <span className="text-sm font-semibold text-foreground ml-1">
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">({reviews.length} reviews)</span>
              </div>

              {product.seller?.shop && (
                <Link
                  href={`/shops/${product.seller.shop.slug || product.seller.shop.id}`}
                  className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>Visit Shop: {product.seller.shop.name}</span>
                </Link>
              )}
            </div>
          </div>

          <div className="border-t border-b border-border py-4 flex items-center justify-between">
            <span className="text-3xl font-extrabold text-foreground">
              {productListService.formatPrice(finalPrice)}
            </span>
            <div className="text-right">
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  stockAvailable > 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {stockAvailable > 0 ? `In Stock (${stockAvailable} available)` : 'Out of stock'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase">Description</h4>
            <p className="text-sm text-foreground leading-relaxed">{product.description}</p>
          </div>

          {/* Variants Select */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase">Select Option</h4>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id === selectedVariantId ? null : v.id)}
                    className={`flex items-center justify-between gap-3 px-4 py-2 border rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      v.id === selectedVariantId
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{v.name}</span>
                    {v.priceDifference !== 0 && (
                      <span className="text-[10px] opacity-80">
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
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase">Specifications</h4>
              <div className="grid grid-cols-2 gap-3 bg-zinc-950/40 p-4 rounded-xl border border-border">
                {product.attributes.map((attr) => (
                  <div key={attr.id} className="text-xs">
                    <span className="font-semibold text-muted-foreground block uppercase text-[10px]">
                      {attr.name}
                    </span>
                    <span className="text-foreground font-medium">{attr.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buy actions */}
          <div className="flex items-center gap-4 pt-4">
            <div className="flex items-center border border-border rounded-lg bg-zinc-950/20 overflow-hidden h-11">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 h-full hover:bg-accent text-sm font-bold cursor-pointer"
                disabled={stockAvailable <= 0}
              >
                -
              </button>
              <span className="px-4 text-sm font-bold text-foreground">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(stockAvailable, q + 1))}
                className="px-3 h-full hover:bg-accent text-sm font-bold cursor-pointer"
                disabled={stockAvailable <= 0}
              >
                +
              </button>
            </div>

            <Button
              onClick={handleAddToCart}
              isLoading={isAdding}
              disabled={stockAvailable <= 0}
              className="flex-1 flex items-center justify-center gap-2 py-5 cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleWishlistToggle}
              className="h-11 w-11 flex items-center justify-center cursor-pointer border-border hover:text-red-500"
            >
              <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Product Reviews section */}
      <div className="border-t border-border pt-12 space-y-8">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Customer Reviews</h3>
          <p className="text-sm text-muted-foreground mt-1">Read reviews left by other marketplace buyers.</p>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-12 items-start">
          {/* Review aggregates */}
          <div className="bg-card border border-border p-6 rounded-2xl space-y-6">
            <div className="text-center space-y-2">
              <span className="text-5xl font-extrabold text-foreground">{averageRating.toFixed(1)}</span>
              <div className="flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.round(averageRating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-zinc-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Based on {reviews.length} reviews</p>
            </div>

            {/* Star progress bars */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-muted-foreground w-3">{star}★</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${starBreakdown[star]}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-8 text-right">
                    {starBreakdown[star]}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews list & Write Review */}
          <div className="space-y-8">
            {/* Reviews display */}
            <div className="space-y-4">
              {reviews.length > 0 ? (
                reviews.map((rev) => (
                  <Card key={rev.id}>
                    <CardContent className="p-6 space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">
                            {rev.customer
                              ? `${rev.customer.firstName} ${rev.customer.lastName || ''}`.trim()
                              : 'Anonymous buyer'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < rev.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed pt-1">
                        {rev.comment || 'No written comment left.'}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <Star className="mx-auto h-8 w-8 text-muted-foreground opacity-50 mb-3" />
                  <p className="text-sm text-muted-foreground">No reviews posted yet. Be the first to review!</p>
                </div>
              )}
            </div>

            {/* Simulated Add Review */}
            <div className="bg-zinc-950/20 border border-border p-6 rounded-2xl space-y-4">
              <h4 className="font-bold text-base">Write a Review</h4>
              {reviewPosted ? (
                <div className="p-4 text-xs font-semibold text-emerald-500 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Your review has been submitted successfully!
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">Select Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className="p-1 cursor-pointer text-yellow-400 hover:scale-110 transition-transform"
                        >
                          <Star className={`h-5 w-5 ${star <= newRating ? 'fill-yellow-400' : 'text-zinc-600'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">Write Comment</label>
                    <textarea
                      placeholder="Share your experience using this product..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
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
