import { Navbar } from '@/shared/components/Navbar';
import { OrderDetailPage } from '@/features/orders/ui/OrderDetailPage';

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const resolvedParams = await params;
  return (
    <>
      <Navbar />
      <main className="py-6 bg-zinc-950/20 min-h-[calc(100dvh-64px)]">
        <OrderDetailPage orderId={resolvedParams.id} />
      </main>
    </>
  );
}
