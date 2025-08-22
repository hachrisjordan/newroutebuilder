/**
 * SeatsAeroConnectionStatus - Displays and manages Seats.aero OAuth connection
 */

'use client';

import { useSeatsAeroOAuth } from '@/hooks/use-seatsaero-oauth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plane, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Loader2,
  ExternalLink 
} from 'lucide-react';

interface SeatsAeroConnectionStatusProps {
  className?: string;
}

export default function SeatsAeroConnectionStatus({ className }: SeatsAeroConnectionStatusProps) {
  const { 
    tokens, 
    isLoading, 
    hasError, 
    isAuthenticated, 
    refreshTokens, 
    signOut 
  } = useSeatsAeroOAuth();

  const formatExpiryTime = (expiresAt: number) => {
    const now = Date.now();
    const timeLeft = expiresAt - now;
    
    if (timeLeft <= 0) return 'Expired';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const getProStatusBadge = () => {
    // This would come from user metadata in a real implementation
    return (
      <Badge variant="secondary" className="ml-2">
        Pro User
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plane className="h-5 w-5 text-blue-600" />
            Seats.aero Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-muted-foreground">Checking connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plane className="h-5 w-5 text-blue-600" />
            Seats.aero Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {hasError}
            </AlertDescription>
          </Alert>
          <div className="mt-3 space-y-2">
            <Button 
              onClick={refreshTokens} 
              variant="outline" 
              size="sm"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated || !tokens) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plane className="h-5 w-5 text-blue-600" />
            Seats.aero Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center">
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Not connected to Seats.aero
            </p>
            <Button 
              onClick={() => window.location.href = '/auth'} 
              variant="outline"
              className="w-full"
            >
              <Plane className="h-4 w-4 mr-2" />
              Connect Account
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plane className="h-5 w-5 text-blue-600" />
          Seats.aero Connection
          {getProStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Successfully connected to Seats.aero
          </AlertDescription>
        </Alert>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant="default">Connected</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Access Token:</span>
            <span className="font-mono text-xs">
              {tokens.accessToken.substring(0, 20)}...
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expires:</span>
            <span className="text-xs">
              {formatExpiryTime(tokens.expiresAt)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Connected:</span>
            <span className="text-xs">
              {new Date(tokens.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={refreshTokens} 
            variant="outline" 
            size="sm"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Connection
          </Button>
          
          <Button 
            onClick={signOut} 
            variant="destructive" 
            size="sm"
            className="w-full"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>
            Your API usage limit (1,000 requests/day) is shared across all connected applications.
          </p>
          <a 
            href="https://seats.aero/settings" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
          >
            Manage OAuth Apps
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
