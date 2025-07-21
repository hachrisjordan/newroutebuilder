import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

// Caching configuration
export const revalidate = 1800; // 30 minutes cache for airports

const AirportSchema = z.object({
  code: z.string().min(3).max(4),
  name: z.string().min(1),
  city: z.string().optional(),
  country: z.string().optional(),
});

type ValidatedAirport = z.infer<typeof AirportSchema>;

// Cache for airport data
let cachedAirports: ValidatedAirport[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

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
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Check cache first
    const now = Date.now();
    if (cachedAirports && (now - cacheTimestamp) < CACHE_TTL) {
      let airports = cachedAirports;
      
      if (search) {
        const searchLower = search.toLowerCase();
        airports = cachedAirports.filter(airport => 
          airport.code.toLowerCase().includes(searchLower) ||
          airport.name.toLowerCase().includes(searchLower) ||
          airport.city?.toLowerCase().includes(searchLower) ||
          airport.country?.toLowerCase().includes(searchLower)
        );
      }
      
      const limitedAirports = airports.slice(0, limit);
      
      return NextResponse.json(limitedAirports, {
        headers: {
          'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      });
    }

    // Fetch from database
    let query = supabase
      .from('airports')
      .select('code, name, city, country')
      .order('name');

    if (search) {
      const searchTerm = `%${search}%`;
      query = query.or(`code.ilike.${searchTerm},name.ilike.${searchTerm},city.ilike.${searchTerm},country.ilike.${searchTerm}`);
    }

    const { data: airports, error } = await query.limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch airports' },
        { status: 500 }
      );
    }

    // Validate data
    const validatedAirports: ValidatedAirport[] = airports?.map(airport => {
      try {
        return AirportSchema.parse(airport);
      } catch (validationError) {
        console.warn('Invalid airport data:', airport, validationError);
        return null;
      }
    }).filter((airport): airport is ValidatedAirport => airport !== null) || [];

    // Update cache only for non-search requests
    if (!search) {
      cachedAirports = validatedAirports;
      cacheTimestamp = now;
    }

    return NextResponse.json(validatedAirports, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
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

    console.error('Airports API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 