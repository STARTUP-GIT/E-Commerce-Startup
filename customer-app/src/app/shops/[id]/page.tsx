import { Navbar } from '@/shared/components/Navbar';
import { Footer } from '@/shared/components/Footer';
import { ShopDetailsPage } from '@/features/shops/shop-details/ui/ShopDetailsPage';

interface ShopPageProps {
  params: Promise<{ id: string }>;
}

export default async function ShopPage({ params }: ShopPageProps) {
  const resolvedParams = await params;
  return (
    <>
      <Navbar />
      <main className="bg-zinc-950/20 min-h-[calc(100vh-64px)] flex flex-col justify-between">
        <div className="flex-1 py-6">
          <ShopDetailsPage shopId={resolvedParams.id} />
        </div>
        <Footer />
      </main>
    </>
  );
}

