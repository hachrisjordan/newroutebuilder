import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

// Caching configuration
export const revalidate = 7200; // 2 hours cache for aircraft config

const AircraftConfigSchema = z.object({
  aircraft_type: z.string(),
  configuration: z.string(),
  // Add other fields as needed
});

export async function GET(
  request: Request,
  { params }: { params: { airline: string } }
) {
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
    const airline = params.airline?.toUpperCase();

    if (!airline) {
      return NextResponse.json(
        { error: 'Airline parameter is required' },
        { status: 400 }
      );
    }

    // Fetch aircraft configurations for the specific airline
    const { data, error } = await supabase
      .from('aircraft_configurations')
      .select('*')
      .eq('airline_code', airline)
      .order('aircraft_type');

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch aircraft configurations' },
        { status: 500 }
      );
    }

    // Validate and return data
    const validatedConfigs = data?.map(config => {
      try {
        return AircraftConfigSchema.parse(config);
      } catch (validationError) {
        console.warn('Invalid aircraft config data:', config, validationError);
        return null;
      }
    }).filter(Boolean) || [];

    return NextResponse.json(validatedConfigs, {
      headers: {
        'Cache-Control': 'public, max-age=7200, stale-while-revalidate=14400',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Aircraft config API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 