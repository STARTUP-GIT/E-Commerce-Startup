import { Navbar } from '@/shared/components/Navbar';
import { NotificationPage } from '@/features/notifications/ui/NotificationPage';
import { Footer } from '@/shared/components/Footer';

export default function NotificationsRoute() {
  return (
    <>
      <Navbar />
      <main className="bg-zinc-950/20 min-h-[calc(100vh-64px)] flex flex-col justify-between">
        <NotificationPage />
      </main>
    </>
  );
}
