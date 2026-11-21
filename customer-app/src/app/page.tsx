'use client';

import { useEffect } from 'react';
import { Footer } from '@/shared/components/Footer';
import { HomePage } from '@/features/home/ui/HomePage';
import { ComingSoonScreen } from '@/features/location/ui/ComingSoonScreen';
import { useLocationStore } from '@/lib/store/locationStore';
import { useSiteLayout } from '@/lib/hooks/useSiteLayout';
import Loading from '@/app/loading';

export default function Home() {
  const { isLoading: isBrandingLoading } = useSiteLayout();
  const { isServiceable, isCheckingServiceability, initLocationFromStorage } = useLocationStore();

  useEffect(() => {
    initLocationFromStorage();
  }, [initLocationFromStorage]);

  if (isBrandingLoading) {
    return <Loading />;
  }

  const showComingSoon = !isServiceable && !isCheckingServiceability;

  return (
    <main className="bg-zinc-950/20 min-h-[calc(100dvh-64px)] flex flex-col justify-between animate-fade-in">
      <div className="flex-1">
        {showComingSoon ? <ComingSoonScreen /> : <HomePage />}
      </div>
      <Footer />
    </main>
  );
}
