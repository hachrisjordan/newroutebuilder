/**
 * SeatsAeroConnectionStatus - Displays and manages Seats.aero OAuth connection
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Link, Unlink } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { initiateOAuthFlow } from '@/lib/seatsaero-oauth';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

interface OAuthProvider {
  name: string;
  linked: boolean;
  email?: string;
  lastLinked?: string;
}

interface InitialOAuthData {
  google: {
    linked: boolean;
    email?: string;
    lastLinked?: string;
  };
  seatsAero: {
    linked: boolean;
    email?: string;
    lastLinked?: string;
  };
}

interface SeatsAeroConnectionStatusProps {
  initialOAuthData: InitialOAuthData;
}

export function SeatsAeroConnectionStatus({ initialOAuthData }: SeatsAeroConnectionStatusProps) {
  const { user } = useUser();
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialOAuthData) {
      // Use server-side data to initialize providers
      const providersList: OAuthProvider[] = [
        {
          name: 'Google',
          linked: initialOAuthData.google.linked,
          email: initialOAuthData.google.email,
          lastLinked: initialOAuthData.google.lastLinked
        },
        {
          name: 'Seats.aero',
          linked: initialOAuthData.seatsAero.linked,
          email: initialOAuthData.seatsAero.email,
          lastLinked: initialOAuthData.seatsAero.lastLinked
        }
      ];
      
      setProviders(providersList);
    }
  }, [initialOAuthData]);

  const handleLinkSeatsAero = async (returnUrl?: string) => {
    setIsLinking(true);
    setError(null);
    
    try {
      // Use the utility function to initiate OAuth flow
      initiateOAuthFlow(returnUrl);
    } catch (error) {
      console.error('Error linking Seats.aero:', error);
      setError('Failed to initiate OAuth flow. Please try again.');
      setIsLinking(false);
    }
  };

  const handleUnlinkSeatsAero = async () => {
    if (!confirm('Are you sure you want to unlink your Seats.aero account? This will remove access to your Seats.aero data.')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call API to unlink Seats.aero
      const response = await fetch('/api/auth/seatsaero/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update local state to reflect the change
        setProviders(prev => prev.map(provider => 
          provider.name === 'Seats.aero' 
            ? { ...provider, linked: false, email: undefined, lastLinked: undefined }
            : provider
        ));
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to unlink Seats.aero');
      }
    } catch (error) {
      console.error('Error unlinking Seats.aero:', error);
      setError(error instanceof Error ? error.message : 'Failed to unlink Seats.aero');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading skeleton when initializing or when performing actions
  if (providers.length === 0 || isLoading) {
    return <LoadingSkeleton />;
  }

  const seatsAeroProvider = providers.find(p => p.name === 'Seats.aero');
  const googleProvider = providers.find(p => p.name === 'Google');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          OAuth Account Connections
        </CardTitle>
        <CardDescription>
          Manage your connected accounts and OAuth providers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <div className="font-medium">Error</div>
                <div className="text-red-700 mt-1">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Google OAuth Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">G</span>
            </div>
            <div>
              <div className="font-medium">Google</div>
              <div className="text-sm text-gray-500">
                {googleProvider?.linked ? googleProvider.email : 'Not connected'}
              </div>
            </div>
          </div>
          <Badge variant={googleProvider?.linked ? "default" : "secondary"}>
            {googleProvider?.linked ? "Connected" : "Not Connected"}
          </Badge>
        </div>

        {/* Seats.aero OAuth Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-semibold">S</span>
            </div>
            <div>
              <div className="font-medium">Seats.aero</div>
              <div className="text-sm text-gray-500">
                {seatsAeroProvider?.linked ? seatsAeroProvider.email : 'Not connected'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {seatsAeroProvider?.linked ? (
              <>
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlinkSeatsAero}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  ) : (
                    <Unlink className="h-4 w-4" />
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleLinkSeatsAero()}
                disabled={isLinking}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLinking ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Connect Seats.aero
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Connection Info */}
        {seatsAeroProvider?.linked && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <div className="font-medium">Seats.aero Connected Successfully!</div>
                <div className="text-green-700 mt-1">
                  You can now access award travel data and use Seats.aero features.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Multiple Provider Info */}
        {googleProvider?.linked && seatsAeroProvider?.linked && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Link className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-medium">Multiple OAuth Providers Linked</div>
                <div className="text-blue-700 mt-1">
                  Your account is connected to both Google and Seats.aero. You can sign in with either provider.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
