import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { PZRecord, PZRouteAnalysis, PZAnalysisResults } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PZRequestSchema = z.object({
  departureAirports: z.array(z.string()),
  arrivalAirports: z.array(z.string()),
  startDate: z.string(), // Format: YYYY-MM-DD
  endDate: z.string(), // Format: YYYY-MM-DD
});

/**
 * Calculate statistical values (average, median) from an array of numbers
 */
function calculateStats(values: number[]): { average: number | null; median: number | null } {
  if (values.length === 0) {
    return { average: null, median: null };
  }

  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  return { average, median };
}

/**
 * Calculate percentage
 */
function calculatePercentage(part: number, total: number): number {
  return total === 0 ? 0 : (part / total) * 100;
}

/**
 * Process PZ data to calculate statistics per route
 */
function processPZData(data: PZRecord[]): PZAnalysisResults {
  // Group data by route (origin-destination)
  const routeGroups = new Map<string, PZRecord[]>();
  
  data.forEach(record => {
    if (record.origin_airport && record.destination_airport) {
      const route = `${record.origin_airport}-${record.destination_airport}`;
      if (!routeGroups.has(route)) {
        routeGroups.set(route, []);
      }
      routeGroups.get(route)!.push(record);
    }
  });

  const routes: PZRouteAnalysis[] = [];
  let totalFlights = 0;
  let totalFlightsWithPZ = 0;
  let totalDays = 0;
  let totalDaysWithPZ = 0;

  routeGroups.forEach((records, route) => {
    // Group by date for day-level analysis
    const dayGroups = new Map<string, PZRecord[]>();
    records.forEach(record => {
      if (!dayGroups.has(record.departure_date)) {
        dayGroups.set(record.departure_date, []);
      }
      dayGroups.get(record.departure_date)!.push(record);
    });

    // Flight-level statistics
    // Get all flights with valid PZ data (>= 0)
    const allFlightsWithData = records.filter(r => {
      if (r.pz === null || r.pz === '') return false;
      const pzValue = parseFloat(r.pz);
      return !isNaN(pzValue) && pzValue >= 0;
    });
    
    // Get flights with PZ > 0 (for percentage calculation)
    const flightsWithPZ = allFlightsWithData.filter(r => {
      const pzValue = parseFloat(r.pz!);
      return pzValue > 0;
    });
    
    // Use all valid PZ values (including 0) for average/median calculation
    const flightPZValues = allFlightsWithData
      .map(r => parseFloat(r.pz!))
      .filter(val => !isNaN(val));
    
    const flightStats = calculateStats(flightPZValues);

    // Day-level statistics
    const daysWithPZ: string[] = [];
    const dayPZValues: number[] = [];

    dayGroups.forEach((dayRecords, date) => {
      // Get all flights with valid PZ data (>= 0) for the day
      const allDayFlightsWithData = dayRecords.filter(r => {
        if (r.pz === null || r.pz === '') return false;
        const pzValue = parseFloat(r.pz);
        return !isNaN(pzValue) && pzValue >= 0;
      });
      
      // Get flights with PZ > 0 for percentage calculation
      const dayFlightsWithPZ = allDayFlightsWithData.filter(r => {
        const pzValue = parseFloat(r.pz!);
        return pzValue > 0;
      });
      
      if (allDayFlightsWithData.length > 0) {
        // Sum all PZ values >= 0 for the day (for average/median calculation)
        const dayPZSum = allDayFlightsWithData
          .map(r => parseFloat(r.pz!))
          .filter(val => !isNaN(val))
          .reduce((sum, val) => sum + val, 0);
        
        // Always include the day sum (even if it's 0)
        dayPZValues.push(dayPZSum);
        
        // Only count as "day with PZ" if there's at least one flight with PZ > 0
        if (dayFlightsWithPZ.length > 0) {
          daysWithPZ.push(date);
        }
      }
    });

    const dayStats = calculateStats(dayPZValues);

    const routeAnalysis: PZRouteAnalysis = {
      route,
      total_flights: records.length,
      total_days: dayGroups.size,
      days_with_pz: daysWithPZ.length,
      flights_with_pz: flightsWithPZ.length,
      average_pz_per_flight: flightStats.average,
      median_pz_per_flight: flightStats.median,
      average_pz_per_day: dayStats.average,
      median_pz_per_day: dayStats.median,
      percentage_flights_with_pz: calculatePercentage(flightsWithPZ.length, allFlightsWithData.length),
      percentage_days_with_pz: calculatePercentage(daysWithPZ.length, dayPZValues.length),
    };

    routes.push(routeAnalysis);

    // Aggregate totals
    totalFlights += records.length;
    totalFlightsWithPZ += flightsWithPZ.length;
    totalDays += dayGroups.size;
    totalDaysWithPZ += daysWithPZ.length;
  });

  return {
    routes: routes.sort((a, b) => a.route.localeCompare(b.route)),
    summary: {
      total_routes: routes.length,
      total_flights: totalFlights,
      total_days: totalDays,
      overall_flight_pz_percentage: calculatePercentage(totalFlightsWithPZ, totalFlights),
      overall_day_pz_percentage: calculatePercentage(totalDaysWithPZ, totalDays),
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = PZRequestSchema.parse(body);

    const { departureAirports, arrivalAirports, startDate, endDate } = validatedData;

    // Build the query
    let query = supabase
      .from('pz')
      .select('*')
      .in('origin_airport', departureAirports)
      .in('destination_airport', arrivalAirports)
      .gte('departure_date', startDate)
      .lte('departure_date', endDate);

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch PZ data' },
        { status: 500 }
      );
    }

    // Process the data to calculate PZ statistics
    const processedData = processPZData(data as PZRecord[]);

    return NextResponse.json({
      data: processedData,
      total_records: data.length,
    });

  } catch (error) {
    console.error('PZ API error:', error);
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
