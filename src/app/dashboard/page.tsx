import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import dynamic from 'next/dynamic';

const UserMenu = dynamic(() => import('@/components/auth-wizard/user-menu'), { ssr: false });

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth');
  }
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-muted">
      <h1 className="text-3xl font-bold mb-4">Welcome to your dashboard</h1>
      <UserMenu />
    </main>
  );
} 