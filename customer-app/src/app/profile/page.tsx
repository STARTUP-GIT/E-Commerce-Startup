import { ProfileDashboard } from '@/features/auth/profile/ui/ProfileDashboard';
import { Navbar } from '@/shared/components/Navbar';

export default function ProfilePage() {
  return (
    <>
      <Navbar />
      <main className="py-8 bg-zinc-950/20 min-h-[calc(100vh-64px)]">
        <ProfileDashboard />
      </main>
    </>
  );
}
