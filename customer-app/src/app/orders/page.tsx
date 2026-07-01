import { Navbar } from '@/shared/components/Navbar';
import { OrderHistoryPage } from '@/features/orders/ui/OrderHistoryPage';

export default function OrdersRoute() {
  return (
    <>
      <Navbar />
      <main className="py-6 bg-zinc-950/20 min-h-[calc(100vh-64px)]">
        <OrderHistoryPage />
      </main>
    </>
  );
}
