'use client';

import React, { useState } from 'react';
import { useShopDetails } from '../hooks/useShopDetails';
import { shopDetailsService } from '../services/shopDetailsService';
import { shopListService } from '../../shop-list/services/shopListService';
import { productListService } from '@/features/products/product-list/services/productListService';
import { Card, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { MapPin, Mail, Phone, ChevronLeft, ChevronRight, Package, Store, Eye } from 'lucide-react';
import Link from 'next/link';

export function ShopDetailsPage({ shopId }: { shopId: string }) {
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    shop,
    categories,
    products,
    pagination,
    isLoading,
    isError,
  } = useShopDetails({
    shopId,
    page,
    limit: 9,
  });

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !shop) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 text-center space-y-4">
        <p className="text-destructive font-semibold">Failed to load shop details.</p>
        <Link href="/">
          <Button>Back to Shops</Button>
        </Link>
      </div>
    );
  }

  const bgBanner = shop.bannerUrl
    ? `url(${shop.bannerUrl})`
    : shopListService.getPlaceholderBanner(shop.name);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-zinc-950">
        <div className="h-36 sm:h-48 md:h-64 bg-cover bg-center" style={{ background: bgBanner }} />
        <div className="px-4 py-6 sm:px-6 relative flex flex-col md:flex-row justify-between items-center md:items-start gap-4 md:gap-6">
          
          {/* Logo overlay / Avatar */}
          <div className="relative md:absolute md:-top-16 md:left-8 h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl border-4 border-card bg-zinc-800 shadow-lg flex items-center justify-center overflow-hidden z-10">
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt={shop.name} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            )}
          </div>

          {/* Shop Details */}
          <div className="w-full md:pl-28 space-y-2 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{shop.name}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl mx-auto md:mx-0 leading-relaxed">{shop.description}</p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-4 text-xs text-muted-foreground pt-1">
              {shop.defaultPickupAddress && (
                <div className="flex items-center gap-1 shrink-0">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {shop.defaultPickupAddress.city}, {shop.defaultPickupAddress.state}
                  </span>
                </div>
              )}
              {shop.supportEmail && (
                <div className="flex items-center gap-1 min-w-0 max-w-full">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{shop.supportEmail}</span>
                </div>
              )}
              {shop.supportPhone && (
                <div className="flex items-center gap-1 shrink-0">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{shop.supportPhone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Categories Sidebar & Products */}
      <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr] gap-6 md:gap-8">
        
        {/* Categories navigation */}
        <aside className="space-y-4 w-full overflow-hidden shrink-0">
          <h3 className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Categories
          </h3>
          <div className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer text-left shrink-0 whitespace-nowrap ${
                selectedCategory === null
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer text-left shrink-0 whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Product listing grid */}
        <div className="space-y-6 flex-1 min-w-0">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((prod) => (
                <Link href={`/products/${prod.id}`} key={prod.id} className="group block">
                  <Card className="overflow-hidden flex flex-col h-full border border-border bg-card hover:shadow-md transition-shadow duration-200">
                    <div className="h-44 bg-zinc-800 relative overflow-hidden shrink-0">
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
                      {prod.stockQuantity <= 0 && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-red-500/90 text-[10px] font-bold text-white uppercase">
                          Out of stock
                        </span>
                      )}
                    </div>
                    <CardContent className="p-4 flex flex-col flex-1 justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">
                          {prod.name}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {prod.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-base sm:text-lg font-extrabold text-foreground">
                          {productListService.formatPrice(prod.price)}
                        </span>
                        <Button size="sm" className="flex items-center gap-1 cursor-pointer">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-16 border border-dashed border-border rounded-xl">
                <Package className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-3" />
                <p className="text-sm text-muted-foreground">No products available in this category.</p>
              </div>
            )}
          </div>

          {/* Pagination controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6 border-t border-border">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
