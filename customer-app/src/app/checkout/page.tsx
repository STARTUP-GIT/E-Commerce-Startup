import { Navbar } from '@/shared/components/Navbar';
import { CheckoutPage } from '@/features/checkout/ui/CheckoutPage';

export default function CheckoutRoute() {
  return (
    <>
      <Navbar />
      <main className="py-6 bg-zinc-950/20 min-h-[calc(100vh-64px)]">
        <CheckoutPage />
      </main>
    </>
  );
}
