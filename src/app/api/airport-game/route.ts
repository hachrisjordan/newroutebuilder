import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600; // 1 hour cache

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
    const difficulty = url.searchParams.get('difficulty') || 'medium';

    // Your existing logic here for airport game
    const { data, error } = await supabase
      .from('airports')
      .select('*')
      .limit(10);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch airport data' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Airport game API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 