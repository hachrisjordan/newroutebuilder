/**
 * Seats.aero OAuth Utility Functions
 * Handles OAuth flow, token management, and API calls
 */

import { 
  SeatsAeroOAuthConfig, 
  SeatsAeroConsentParams, 
  SeatsAeroTokenRequest, 
  SeatsAeroTokenResponse, 
  SeatsAeroUserInfo,
  SeatsAeroOAuthError 
} from '@/types/seatsaero-oauth';

/**
 * OAuth Configuration
 * Note: CLIENT_ID and CLIENT_SECRET must be set in environment variables
 */
export const SEATS_AERO_OAUTH_CONFIG: SeatsAeroOAuthConfig = {
  clientId: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
  redirectUri: 'https://www.bbairtools.com/seatsaero',
  consentUrl: 'https://seats.aero/oauth2/consent',
  tokenUrl: 'https://seats.aero/oauth2/token',
  userInfoUrl: 'https://seats.aero/oauth2/userinfo'
};

// Log the config for debugging
console.log('Seats.aero OAuth Config:', {
  clientId: SEATS_AERO_OAUTH_CONFIG.clientId ? 'SET' : 'NOT SET',
  clientSecret: SEATS_AERO_OAUTH_CONFIG.clientSecret ? 'SET' : 'NOT SET',
  redirectUri: SEATS_AERO_OAUTH_CONFIG.redirectUri,
  consentUrl: SEATS_AERO_OAUTH_CONFIG.consentUrl,
  tokenUrl: SEATS_AERO_OAUTH_CONFIG.tokenUrl
});

/**
 * Validate OAuth configuration
 */
export function validateOAuthConfig(): void {
  if (!SEATS_AERO_OAUTH_CONFIG.clientId) {
    throw new Error('CLIENT_ID environment variable is not set. Please add CLIENT_ID to your .env.local file.');
  }
  if (!SEATS_AERO_OAUTH_CONFIG.clientSecret) {
    throw new Error('CLIENT_SECRET environment variable is not set. Please add CLIENT_SECRET to your .env.local file.');
  }
}

/**
 * Generate a random state parameter for OAuth security
 */
export function generateOAuthState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Build the OAuth consent URL
 */
export function buildConsentUrl(state: string): string {
  const params: SeatsAeroConsentParams = {
    response_type: 'code',
    client_id: SEATS_AERO_OAUTH_CONFIG.clientId,
    redirect_uri: SEATS_AERO_OAUTH_CONFIG.redirectUri,
    state,
    scope: 'openid'
  };

  // Manually encode the redirect_uri to avoid double-encoding issues
  const encodedRedirectUri = encodeURIComponent(params.redirect_uri);
  
  return `${SEATS_AERO_OAUTH_CONFIG.consentUrl}?response_type=${params.response_type}&client_id=${encodeURIComponent(params.client_id)}&redirect_uri=${encodedRedirectUri}&state=${encodeURIComponent(params.state)}&scope=${params.scope}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string, 
  state: string
): Promise<SeatsAeroTokenResponse> {
  const tokenRequest: SeatsAeroTokenRequest = {
    code,
    client_id: SEATS_AERO_OAUTH_CONFIG.clientId,
    client_secret: SEATS_AERO_OAUTH_CONFIG.clientSecret,
    redirect_uri: SEATS_AERO_OAUTH_CONFIG.redirectUri,
    grant_type: 'authorization_code',
    state,
    scope: 'openid'
  };

  console.log('Token request URL:', SEATS_AERO_OAUTH_CONFIG.tokenUrl);
  console.log('Token request body:', {
    code: tokenRequest.code,
    client_id: tokenRequest.client_id,
    redirect_uri: tokenRequest.redirect_uri,
    grant_type: tokenRequest.grant_type,
    state: tokenRequest.state,
    scope: tokenRequest.scope
  });

  const response = await fetch(SEATS_AERO_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(tokenRequest as unknown as Record<string, string>)
  });

  console.log('Token response status:', response.status);
  console.log('Token response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const responseText = await response.text();
    console.error('Token exchange failed. Response:', responseText);
    
    // Try to parse as JSON for error details
    try {
      const errorData: SeatsAeroOAuthError = JSON.parse(responseText);
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
    } catch (parseError) {
      // If it's not JSON, throw the raw response
      throw new Error(`Token exchange failed with status ${response.status}: ${responseText.substring(0, 200)}`);
    }
  }

  const responseText = await response.text();
  console.log('Token response body:', responseText);

  try {
    return JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse token response as JSON:', responseText);
    throw new Error(`Invalid JSON response from Seats.aero: ${responseText.substring(0, 200)}`);
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<SeatsAeroTokenResponse> {
  const tokenRequest: SeatsAeroTokenRequest = {
    code: '', // Not needed for refresh
    client_id: SEATS_AERO_OAUTH_CONFIG.clientId,
    client_secret: SEATS_AERO_OAUTH_CONFIG.clientSecret,
    redirect_uri: SEATS_AERO_OAUTH_CONFIG.redirectUri,
    grant_type: 'refresh_token',
    state: '', // Not needed for refresh
    scope: 'openid',
    refresh_token: refreshToken
  };

  const response = await fetch(SEATS_AERO_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(tokenRequest as unknown as Record<string, string>)
  });

  if (!response.ok) {
    const errorData: SeatsAeroOAuthError = await response.json();
    throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error}`);
  }

  return response.json();
}

/**
 * Get user information using access token
 */
export async function getUserInfo(accessToken: string): Promise<SeatsAeroUserInfo> {
  const response = await fetch(SEATS_AERO_OAUTH_CONFIG.userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Make authenticated API call to Seats.aero partner APIs
 */
export async function makeAuthenticatedApiCall<T>(
  accessToken: string, 
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Partner-Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if access token is expired
 */
export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

/**
 * Calculate token expiration time
 */
export function calculateExpirationTime(expiresIn: number): number {
  return Date.now() + (expiresIn * 1000);
}