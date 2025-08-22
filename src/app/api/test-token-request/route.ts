import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    // Test the exact token request that's failing
    const tokenRequest = {
      code,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: 'https://www.bbairtools.com/seatsaero',
      grant_type: 'authorization_code',
      state,
      scope: 'openid'
    };

    console.log('Testing token request with:', {
      code: tokenRequest.code,
      client_id: tokenRequest.client_id,
      redirect_uri: tokenRequest.redirect_uri,
      grant_type: tokenRequest.grant_type,
      state: tokenRequest.state,
      scope: tokenRequest.scope
    });

    const response = await fetch('https://seats.aero/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenRequest as Record<string, string>)
    });

    const responseText = await response.text();
    
    console.log('Seats.aero response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText.substring(0, 500)
    });

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response_body: responseText.substring(0, 1000),
      request_sent: tokenRequest
    });

  } catch (error) {
    console.error('Test token request error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
