import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Caching configuration
export const revalidate = 7200; // 2 hours cache for reliability data

export async function GET(req: Request) {
  try {
    // Create Supabase client inside the function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const airline = url.searchParams.get('airline');
    const route = url.searchParams.get('route');

    let query = supabase.from('reliability').select('*');

    if (airline) {
      query = query.eq('airline', airline.toUpperCase());
    }

    if (route) {
      query = query.eq('route', route.toUpperCase());
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reliability data' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'public, max-age=7200, stale-while-revalidate=14400',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Reliability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 