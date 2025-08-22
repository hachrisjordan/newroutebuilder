/**
 * Debug endpoint to verify OAuth configuration
 * This should only be used in development
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const envVars = {
      CLIENT_ID: process.env.CLIENT_ID ? 'SET' : 'NOT SET',
      CLIENT_SECRET: process.env.CLIENT_SECRET ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_SEATS_AERO_REDIRECT_URI: process.env.NEXT_PUBLIC_SEATS_AERO_REDIRECT_URI || 'NOT SET'
    };

    // Test the OAuth config validation
    let validationError = null;
    try {
      const { validateOAuthConfig } = await import('@/lib/seatsaero-oauth');
      validateOAuthConfig();
    } catch (error) {
      validationError = error instanceof Error ? error.message : 'Unknown error';
    }

    return NextResponse.json({
      success: true,
      environment_variables: envVars,
      validation_error: validationError,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get debug info', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
