/**
 * Test page for OAuth URL generation
 * This helps debug OAuth configuration issues
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TestOAuthPage() {
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const generateOAuthUrl = () => {
    try {
      setError('');
      
      // Generate a random state parameter
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Build the consent URL
      const consentUrl = new URL('https://seats.aero/oauth2/consent');
      consentUrl.searchParams.set('response_type', 'code');
      consentUrl.searchParams.set('client_id', 'seats:cid:31cVzYWxiOhZ7w31VpQW27Se4Tg');
      consentUrl.searchParams.set('redirect_uri', 'https://bbairtools.com/seatsaero');
      consentUrl.searchParams.set('state', state);
      consentUrl.searchParams.set('scope', 'openid');

      const finalUrl = consentUrl.toString();
      setGeneratedUrl(finalUrl);
      
      console.log('Generated OAuth URL:', finalUrl);
      console.log('URL Parameters:', {
        response_type: consentUrl.searchParams.get('response_type'),
        client_id: consentUrl.searchParams.get('client_id'),
        redirect_uri: consentUrl.searchParams.get('redirect_uri'),
        state: consentUrl.searchParams.get('state'),
        scope: consentUrl.searchParams.get('scope')
      });
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      console.error('Error generating OAuth URL:', error);
    }
  };

  const testOAuthFlow = () => {
    if (generatedUrl) {
      // Store state for validation
      const state = new URL(generatedUrl).searchParams.get('state');
      if (state) {
        sessionStorage.setItem('seatsaero_oauth_state', state);
      }
      
      // Redirect to Seats.aero
      window.location.href = generatedUrl;
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center bg-background pt-8 pb-12 px-2 sm:px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">OAuth URL Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-id">Client ID</Label>
            <Input
              id="client-id"
              value="seats:cid:31cVzYWxiOhZ7w31VpQW27Se4Tg"
              readOnly
              className="font-mono text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="redirect-uri">Redirect URI</Label>
            <Input
              id="redirect-uri"
              value="https://bbairtools.com/seatsaero"
              readOnly
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scope">Scope</Label>
            <Input
              id="scope"
              value="openid"
              readOnly
              className="font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={generateOAuthUrl}>
              Generate OAuth URL
            </Button>
            
            {generatedUrl && (
              <Button onClick={testOAuthFlow} variant="outline">
                Test OAuth Flow
              </Button>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 p-3 bg-red-50 rounded border">
              {error}
            </div>
          )}

          {generatedUrl && (
            <div className="space-y-2">
              <Label>Generated URL:</Label>
              <div className="p-3 bg-gray-50 rounded border font-mono text-sm break-all">
                {generatedUrl}
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p>Click "Test OAuth Flow" to test this URL with Seats.aero</p>
                <p>Check the browser console for detailed parameter logging</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
