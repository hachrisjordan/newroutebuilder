import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

// Enhanced caching for this route
export const revalidate = 3600; // 1 hour cache

const AirlineSchema = z.object({
  code: z.string().min(1).max(5),
  name: z.string().min(1),
});

type ValidatedAirline = z.infer<typeof AirlineSchema>;

// Cache for airline data
let cachedAirlines: ValidatedAirline[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

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
    const search = url.searchParams.get('search');

    // Check cache first
    const now = Date.now();
    if (cachedAirlines && (now - cacheTimestamp) < CACHE_TTL) {
      const airlines = search 
        ? cachedAirlines.filter(airline => 
            airline.name.toLowerCase().includes(search.toLowerCase()) ||
            airline.code.toLowerCase().includes(search.toLowerCase())
          )
        : cachedAirlines;
      
      return NextResponse.json(airlines, {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      });
    }

    // Fetch from database
    const { data: airlines, error } = await supabase
      .from('airline_availability_all')
      .select('code, name')
      .order('name');

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch airlines' },
        { status: 500 }
      );
    }

    // Validate data
    const validatedAirlines: ValidatedAirline[] = airlines?.map(airline => {
      try {
        return AirlineSchema.parse(airline);
      } catch (validationError) {
        console.warn('Invalid airline data:', airline, validationError);
        return null;
      }
    }).filter((airline): airline is ValidatedAirline => airline !== null) || [];

    // Update cache
    cachedAirlines = validatedAirlines;
    cacheTimestamp = now;

    // Filter if search query provided
    const filteredAirlines = search 
      ? validatedAirlines.filter(airline => 
          airline.name.toLowerCase().includes(search.toLowerCase()) ||
          airline.code.toLowerCase().includes(search.toLowerCase())
        )
      : validatedAirlines;

    return NextResponse.json(filteredAirlines, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
      },
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Airlines API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 