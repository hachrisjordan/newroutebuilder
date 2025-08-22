import { SeatsAeroConnectionStatus } from '@/components/auth-wizard/seatsaero-connection-status';

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        
        <div className="space-y-8">
          {/* OAuth Connections */}
          <SeatsAeroConnectionStatus />
          
          {/* Other settings sections can go here */}
        </div>
      </div>
    </div>
  );
} 