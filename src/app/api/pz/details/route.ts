import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PZDetailsRequestSchema = z.object({
  route: z.string(), // Format: "ORIGIN-DESTINATION"
  startDate: z.string(), // Format: YYYY-MM-DD
  endDate: z.string(), // Format: YYYY-MM-DD
});

export interface PZDetailRecord {
  departure_date: string;
  flight_number: string;
  pz: number;
  origin_airport: string;
  destination_airport: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = PZDetailsRequestSchema.parse(body);

    const { route, startDate, endDate } = validatedData;
    
    // Parse route
    const [origin, destination] = route.split('-');
    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Invalid route format. Expected "ORIGIN-DESTINATION"' },
        { status: 400 }
      );
    }

    // Build the query
    let query = supabase
      .from('pz')
      .select('departure_date, flight_number, pz, origin_airport, destination_airport')
      .eq('origin_airport', origin)
      .eq('destination_airport', destination)
      .gte('departure_date', startDate)
      .lte('departure_date', endDate)
      .order('departure_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch PZ details' },
        { status: 500 }
      );
    }

    // Filter and process the data
    const processedData: PZDetailRecord[] = data
      .filter(record => record.pz !== null && record.pz !== '')
      .map(record => ({
        departure_date: record.departure_date,
        flight_number: record.flight_number,
        pz: parseFloat(record.pz),
        origin_airport: record.origin_airport,
        destination_airport: record.destination_airport,
      }))
      .filter(record => !isNaN(record.pz) && record.pz >= 0);

    return NextResponse.json({
      route,
      data: processedData,
      total_records: processedData.length,
    });

  } catch (error) {
    console.error('PZ details API error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
