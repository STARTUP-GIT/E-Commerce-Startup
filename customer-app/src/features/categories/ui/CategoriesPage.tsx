'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import Link from 'next/link';
import { Skeleton } from '@/shared/components/Skeleton';
import { Grid3X3, ArrowRight } from 'lucide-react';

export function CategoriesPage() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['allowed-categories'],
    queryFn: async () => (await axiosInstance.get('/api/categories/allowed')).data,
    staleTime: 5 * 60_000,
  });

  const categories = data?.categories || [];

  return (
    <div className="min-h-screen bg-[#080808]">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="text-center mb-10 sm:mb-14 lg:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.10] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest text-white/50 uppercase">Browse by category</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight text-white leading-[0.9]">
            Explore
            <span className="block sm:inline bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent"> Categories</span>
          </h1>
          <p className="text-sm sm:text-base text-white/40 mt-4 sm:mt-6 max-w-xl mx-auto leading-relaxed">
            Discover products across every category. All managed by our marketplace team.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                <Skeleton className="w-full h-full !rounded-none" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20">
            <Grid3X3 className="mx-auto h-12 w-12 text-white/20 mb-4" />
            <p className="text-white/40 text-sm font-medium">No categories available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {categories.map((cat: any, i: number) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                className="group block"
                style={{ animation: `card-appear 0.4s ease both`, animationDelay: `${i * 50}ms` }}
              >
                <div className="relative aspect-square rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden flex flex-col items-center justify-center p-4 sm:p-6 group-hover:bg-white/[0.06] group-hover:border-white/[0.15] group-hover:scale-[1.02] group-active:scale-[0.98] transition-all duration-200">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center overflow-hidden group-hover:bg-white group-hover:scale-110 transition-all duration-200 mb-3 sm:mb-4">
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <Grid3X3 className="w-5 h-5 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white/50 group-hover:text-black transition-colors duration-200" />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm lg:text-base font-extrabold text-white/70 group-hover:text-white text-center leading-tight transition-colors duration-200 line-clamp-2">
                    {cat.name}
                  </span>
                  <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
