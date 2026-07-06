'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProductList } from '../hooks/useProductList';
import { productListService } from '../services/productListService';
import { Card, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Search, Filter, Package, Star, Eye, ChevronLeft, ChevronRight, Compass, Sparkles, History } from 'lucide-react';
import Link from 'next/link';

export function ProductListPage() {
  const searchParams = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState<'all' | 'recommended' | 'recently-viewed'>('all');
  const [page, setPage] = useState(1);

  // Filters State
  const [categoryId, setCategoryId] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [rating, setRating] = useState('');

  // Sync state with URL search params
  useEffect(() => {
    if (searchParams) {
      const q = searchParams.get('q');
      const category = searchParams.get('category');
      if (q !== null) {
        setSearchQuery(q);
      }
      if (category !== null) {
        setCategoryId(category);
      }
    }
  }, [searchParams]);

  const { products, totalPages, isLoading, isError, refetch } = useProductList({
    searchQuery,
    mode: mode === 'all' ? 'all' : mode,
    page,
    limit: 9,
    filters:
      mode === 'all'
        ? {
            categoryId,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            rating: rating ? parseFloat(rating) : undefined,
          }
        : null,
  });


  const clearFilters = () => {
    setCategoryId('');
    setMinPrice('');
    setMaxPrice('');
    setRating('');
    setSearchQuery('');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Intro section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-zinc-400 bg-clip-text text-transparent">
            Explore Products
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Browse through active shop products, customizable prints, and handcrafted local goods.
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex bg-secondary p-1 rounded-lg border border-border self-start">
          <button
            onClick={() => {
              setMode('all');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'all' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            All Browse
          </button>
          <button
            onClick={() => {
              setMode('recommended');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'recommended' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Recommended
          </button>
          <button
            onClick={() => {
              setMode('recently-viewed');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'recently-viewed' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Recently Viewed
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid md:grid-cols-[260px_1fr] gap-8 items-start">
        {/* Sidebar Filters */}
        <aside className="space-y-6 bg-card border border-border p-5 rounded-2xl">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Filter className="h-4 w-4 text-primary" />
              Filters
            </span>
            <button
              onClick={clearFilters}
              className="text-[10px] text-primary font-bold uppercase hover:underline cursor-pointer"
            >
              Clear All
            </button>
          </div>

          {/* Search filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Keyword</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Categories */}
          {mode === 'all' && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">All Categories</option>
                  <option value="3d-prints">3D Prints</option>
                  <option value="crafts">Crafts</option>
                  <option value="decor">Decor</option>
                  <option value="clothing">Clothing</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Price range */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Price Range</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Min"
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Input
                    placeholder="Max"
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Ratings */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Minimum Rating</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Any Rating</option>
                  <option value="4.5">4.5★ & Above</option>
                  <option value="4">4.0★ & Above</option>
                  <option value="3">3.0★ & Above</option>
                </select>
              </div>
            </>
          )}
        </aside>

        {/* Products list column */}
        <div className="space-y-8">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-44 w-full" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-destructive font-semibold">Error loading products.</p>
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((prod) => (
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
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
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
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl max-w-md mx-auto">
              <Package className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <h4 className="text-base font-bold text-foreground">No products found</h4>
              <p className="text-sm text-muted-foreground mt-1 px-4">
                We couldn&apos;t find any products matching your current filters or search query.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
