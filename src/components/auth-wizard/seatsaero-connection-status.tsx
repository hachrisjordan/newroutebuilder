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

interface OAuthProvider {
  name: string;
  linked: boolean;
  email?: string;
  lastLinked?: string;
}

export function SeatsAeroConnectionStatus() {
  const { user } = useUser();
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (user) {
      loadOAuthProviders();
    }
  }, [user]);

  const loadOAuthProviders = async () => {
    if (!user) return;
    
    try {
      // Get user metadata to see linked providers
      const linkedProviders = user.user_metadata?.linked_providers || [];
      
      const providersList: OAuthProvider[] = [
        {
          name: 'Google',
          linked: linkedProviders.includes('google'),
          email: user.email,
          lastLinked: user.created_at
        },
        {
          name: 'Seats.aero',
          linked: linkedProviders.includes('seatsaero'),
          email: user.user_metadata?.seatsaero_user_email,
          lastLinked: user.user_metadata?.seatsaero_linked_at
        }
      ];
      
      setProviders(providersList);
    } catch (error) {
      console.error('Error loading OAuth providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkSeatsAero = async () => {
    setIsLinking(true);
    try {
      // Redirect to Seats.aero OAuth
      const redirectUri = encodeURIComponent(`${window.location.origin}/seatsaero`);
      const state = Math.random().toString(36).substring(7);
      const consentUrl = `https://seats.aero/oauth2/consent?response_type=code&client_id=${process.env.NEXT_PUBLIC_SEATS_AERO_CLIENT_ID}&redirect_uri=${redirectUri}&scope=openid&state=${state}`;
      
      window.location.href = consentUrl;
    } catch (error) {
      console.error('Error linking Seats.aero:', error);
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkSeatsAero = async () => {
    if (!confirm('Are you sure you want to unlink your Seats.aero account? This will remove access to your Seats.aero data.')) {
      return;
    }

    try {
      // Call API to unlink Seats.aero
      const response = await fetch('/api/auth/seatsaero/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Reload providers
        await loadOAuthProviders();
      } else {
        console.error('Failed to unlink Seats.aero');
      }
    } catch (error) {
      console.error('Error unlinking Seats.aero:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
                  className="text-red-600 hover:text-red-700"
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={handleLinkSeatsAero}
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
