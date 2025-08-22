import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const LoadFactorRequestSchema = z.object({
  departureAirports: z.array(z.string()),
  arrivalAirports: z.array(z.string()),
  startMonth: z.string(), // Format: YYYY-MM
  endMonth: z.string(), // Format: YYYY-MM
  airlines: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = LoadFactorRequestSchema.parse(body);

    const { departureAirports, arrivalAirports, startMonth, endMonth, airlines } = validatedData;

    // Parse date range
    const startDate = new Date(startMonth + '-01');
    const endDate = new Date(endMonth + '-01');
    
    const startYear = startDate.getFullYear();
    const startMonthNum = startDate.getMonth() + 1;
    const endYear = endDate.getFullYear();
    const endMonthNum = endDate.getMonth() + 1;

    // Build the query
    let query = supabase
      .from('historical_flights')
      .select('*')
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

    // Add airline filter if specified
    if (airlines && airlines.length > 0) {
      query = query.in('"UNIQUE_CARRIER"', airlines);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch load factor data' },
        { status: 500 }
      );
    }

    // Process the data to calculate load factor statistics
    const processedData = processLoadFactorData(data, startMonth, endMonth);

    return NextResponse.json({
      data: processedData,
      summary: calculateSummary(processedData),
      total_records: data.length,
    });

  } catch (error) {
    console.error('Load factor API error:', error);
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

function processLoadFactorData(data: any[], startMonth: string, endMonth: string) {
  // Calculate the number of months in the date range for dynamic thresholds
  const startDate = new Date(startMonth + '-01');
  const endDate = new Date(endMonth + '-01');
  const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                     (endDate.getMonth() - startDate.getMonth()) + 1;
  
  // Dynamic thresholds based on date range
  const minPassengersPerMonth = 500; // Minimum 500 passengers per month
  const minSeatsPerMonth = 500; // Minimum 500 seats per month
  const minPassengers = minPassengersPerMonth * monthsDiff;
  const minSeats = minSeatsPerMonth * monthsDiff;
  
  // Group by route and airline
  const groupedData: { [key: string]: any } = {};

  data.forEach(record => {
    const routeKey = `${record.ORIGIN}-${record.DEST}-${record.UNIQUE_CARRIER}`;
    
    if (!groupedData[routeKey]) {
      groupedData[routeKey] = {
        origin: record.ORIGIN,
        destination: record.DEST,
        airline: record.UNIQUE_CARRIER,
        passengers: 0,
        seats: 0,
      };
    }

    const group = groupedData[routeKey];
    group.passengers += record.PASSENGERS || 0;
    group.seats += record.SEATS || 0;
  });

  // Convert to array, calculate load factor, and filter outliers
  const processedData = Object.values(groupedData)
    .map((group: any) => ({
      origin: group.origin,
      destination: group.destination,
      airline: group.airline,
      passengers: group.passengers,
      seats: group.seats,
      load_factor: group.seats > 0 ? group.passengers / group.seats : 0,
    }))
    .filter((route: any) => {
      // Filter out suspicious load factors (too high or too low)
      const minLoadFactor = 0.1; // 10% minimum load factor
      const maxLoadFactor = 0.99; // 99% maximum load factor (allowing for some rounding)
      
      return (
        route.passengers >= minPassengers &&
        route.seats >= minSeats &&
        route.load_factor >= minLoadFactor &&
        route.load_factor <= maxLoadFactor
      );
    });

  return processedData;
}

function calculateSummary(data: any[]) {
  const totalPassengers = data.reduce((sum, route) => sum + route.passengers, 0);
  const totalSeats = data.reduce((sum, route) => sum + route.seats, 0);
  const overallLoadFactor = totalSeats > 0 ? totalPassengers / totalSeats : 0;

  return {
    total_passengers: totalPassengers,
    total_seats: totalSeats,
    overall_load_factor: overallLoadFactor,
    routes_count: data.length,
  };
} 