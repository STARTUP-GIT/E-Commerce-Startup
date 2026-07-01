'use client';

import React, { useState } from 'react';
import { useShopDetails } from '../hooks/useShopDetails';
import { shopDetailsService } from '../services/shopDetailsService';
import { shopListService } from '../../shop-list/services/shopListService';
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
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
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
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-zinc-950">
        <div className="h-48 md:h-64 bg-cover bg-center" style={{ background: bgBanner }} />
        <div className="p-6 pt-16 md:pt-6 md:pl-32 relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Logo overlay */}
          <div className="absolute -top-12 left-6 md:left-8 h-24 w-24 rounded-2xl border-4 border-card bg-zinc-800 shadow-lg flex items-center justify-center overflow-hidden">
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt={shop.name} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-10 w-10 text-white" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{shop.name}</h1>
            <p className="text-muted-foreground text-sm max-w-2xl">{shop.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
              {shop.defaultPickupAddress && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>
                    {shop.defaultPickupAddress.city}, {shop.defaultPickupAddress.state}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                <span>{shop.supportEmail || 'No support email'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                <span>{shop.supportPhone || 'No support phone'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Categories Sidebar & Products */}
      <div className="grid md:grid-cols-[240px_1fr] gap-8">
        {/* Categories navigation */}
        <aside className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Categories
          </h3>
          <div className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left w-full ${
                selectedCategory === null
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left w-full ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Product listing grid */}
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((prod) => (
                <Link href={`/products/${prod.id}`} key={prod.id} className="group block">
                  <Card className="overflow-hidden h-full border border-border bg-card hover:shadow-md transition-shadow duration-200">
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
                      {prod.stockQuantity <= 0 && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-red-500/90 text-[10px] font-bold text-white uppercase">
                          Out of stock
                        </span>
                      )}
                    </div>
                    <CardContent className="p-4 flex flex-col justify-between h-[calc(100%-176px)]">
                      <div className="space-y-1">
                        <h4 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">
                          {prod.name}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {prod.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-lg font-extrabold text-foreground">
                          ${Number(prod.price).toFixed(2)}
                        </span>
                        <Button size="sm" className="flex items-center gap-1 cursor-pointer">
                          <Eye className="h-3 w-3" />
                          View Details
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
