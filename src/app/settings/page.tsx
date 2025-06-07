import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import dynamic from 'next/dynamic';

const ApiKeySettings = dynamic(() => import('@/components/settings/api-key-settings'), { ssr: false });

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth');
  }
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-muted">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={user.user_metadata?.name || ''}
              readOnly
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700 cursor-not-allowed"
            />
          </div>
        </div>
        <ApiKeySettings />
      </Card>
    </main>
  );
} 