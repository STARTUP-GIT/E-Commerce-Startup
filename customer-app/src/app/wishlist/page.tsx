import { Navbar } from '@/shared/components/Navbar';
import { WishlistPage } from '@/features/wishlist/ui/WishlistPage';

export default function WishlistRoute() {
  return (
    <>
      <Navbar />
      <main className="py-6 bg-zinc-950/20 min-h-[calc(100dvh-64px)]">
        <WishlistPage />
      </main>
    </>
  );
}
