import { Navbar } from '@/shared/components/Navbar';
import { Footer } from '@/shared/components/Footer';
import { ProductDetailsPage } from '@/features/products/product-details/ui/ProductDetailsPage';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  return (
    <>
      <Navbar />
      <main className="bg-zinc-950/20 min-h-[calc(100vh-64px)] flex flex-col justify-between">
        <div className="flex-1 py-6">
          <ProductDetailsPage productId={resolvedParams.id} />
        </div>
        <Footer />
      </main>
    </>
  );
}

