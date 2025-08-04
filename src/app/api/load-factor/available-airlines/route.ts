import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const AvailableAirlinesRequestSchema = z.object({
  departureAirports: z.array(z.string()),
  arrivalAirports: z.array(z.string()),
  startMonth: z.string(), // Format: YYYY-MM
  endMonth: z.string(), // Format: YYYY-MM
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = AvailableAirlinesRequestSchema.parse(body);

    const { departureAirports, arrivalAirports, startMonth, endMonth } = validatedData;

    // Parse date range
    const startDate = new Date(startMonth + '-01');
    const endDate = new Date(endMonth + '-01');
    
    const startYear = startDate.getFullYear();
    const startMonthNum = startDate.getMonth() + 1;
    const endYear = endDate.getFullYear();
    const endMonthNum = endDate.getMonth() + 1;

    // Build the query to get unique airlines
    let query = supabase
      .from('historical_flights')
      .select('"UNIQUE_CARRIER"')
      .in('"ORIGIN"', departureAirports)
      .in('"DEST"', arrivalAirports);

    // Add date range filter
    if (startYear === endYear) {
      // Same year, filter by month range
      query = query
        .eq('year', startYear)
        .gte('"MONTH"', startMonthNum)
        .lte('"MONTH"', endMonthNum);
    } else {
      // Different years, need more complex filtering
      query = query.or(
        `and(year.eq.${startYear},"MONTH".gte.${startMonthNum}),` +
        `and(year.gt.${startYear},year.lt.${endYear}),` +
        `and(year.eq.${endYear},"MONTH".lte.${endMonthNum})`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch available airlines' },
        { status: 500 }
      );
    }

    // Extract unique airline codes from the actual data
    const uniqueAirlines = [...new Set(data.map(record => record.UNIQUE_CARRIER))].filter(Boolean).sort();

    return NextResponse.json({
      airlines: uniqueAirlines,
      count: uniqueAirlines.length,
    });

  } catch (error) {
    console.error('Available airlines API error:', error);
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