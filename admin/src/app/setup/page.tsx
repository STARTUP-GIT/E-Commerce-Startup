import type { Metadata } from 'next';
import { SetupPage } from '@/features/auth/ui/SetupPage';

export const metadata: Metadata = {
  title: 'Administrator Setup — Marketplace',
  description: 'One-time first-administrator setup for the marketplace control panel.',
};

export default function SetupRoute() {
  return <SetupPage />;
}
