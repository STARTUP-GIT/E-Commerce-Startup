import { CustomOrderPage } from '@/features/custom-orders/ui/CustomOrderPage';

export const metadata = {
  title: 'Custom Manufacturing Requests | Marketplace',
  description: 'Submit custom 3D printing and manufacturing designs to verify quotations and track bespoke production.',
};

export default function CustomOrdersRoutePage() {
  return <CustomOrderPage />;
}
