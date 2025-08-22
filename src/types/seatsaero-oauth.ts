/**
 * Seats.aero OAuth Types
 * Defines the structure for OAuth flow, tokens, and user information
 */

export interface SeatsAeroOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  consentUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

export interface SeatsAeroConsentParams {
  response_type: 'code';
  client_id: string;
  redirect_uri: string;
  state: string;
  scope: 'openid';
}

export interface SeatsAeroTokenRequest {
  code: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  grant_type: 'authorization_code' | 'refresh_token';
  state: string;
  scope: 'openid';
  refresh_token?: string;
}

export interface SeatsAeroTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface SeatsAeroUserInfo {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  pro_status?: boolean;
  subscription_end?: string;
}

export interface SeatsAeroOAuthState {
  state: string;
  timestamp: number;
  userId?: string;
}

export interface SeatsAeroStoredTokens {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface SeatsAeroOAuthError {
  error: string;
  error_description?: string;
  state?: string;
}
