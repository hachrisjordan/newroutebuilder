import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';

// Force this page to be dynamic
export const dynamic = 'force-dynamic';

const UserMenu = dynamic(() => import('@/components/auth-wizard/user-menu'), { ssr: false });

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth');
  }
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-muted">
      <h1 className="text-3xl font-bold mb-4">Welcome to your dashboard</h1>
      <UserMenu />
    </main>
  );
} 