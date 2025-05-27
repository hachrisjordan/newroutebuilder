import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Zod schema for request validation
const availabilityV2Schema = z.object({
  routeId: z.string().min(3),
  startDate: z.string().min(8),
  endDate: z.string().min(8),
  cabin: z.string().optional(),
  carriers: z.string().optional(),
});

const SEATS_SEARCH_URL = "https://seats.aero/partnerapi/search?";

if (!SEATS_SEARCH_URL) {
  throw new Error('SEATS_SEARCH_URL environment variable is not set');
}

/**
 * POST /api/availability-v2
 * @param req NextRequest
 */
export async function POST(req: NextRequest) {
  try {
    // Validate API key
    const apiKey = req.headers.get('partner-authorization');
    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Parse and validate body
    const body = await req.json();
    const parseResult = availabilityV2Schema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: parseResult.error.errors }, { status: 400 });
    }
    const { routeId, startDate, endDate, cabin, carriers } = parseResult.data;

    // Parse route segments
    const segments = routeId.split('-');
    const originAirports = segments[0].split('/');
    const destinationSegments = segments[segments.length - 1].split('/');
    const middleSegments = segments.slice(1, -1).map(seg => seg.split('/'));

    // Pagination variables
    let hasMore = true;
    let skip = 0;
    let cursor: string | null = null;
    let processedCount = 0;
    const uniqueItems = new Map<string, boolean>();
    const results: any[] = [];

    // Continue fetching until all data is retrieved
    while (hasMore) {
      // Combine all origins and connections
      const allOrigins = [...originAirports];
      const allDestinations = [...destinationSegments];
      middleSegments.forEach(segment => {
        allOrigins.push(...segment);
        allDestinations.unshift(...segment);
      });

      // Construct search params (only include known working params)
      const searchParams = new URLSearchParams({
        origin_airport: allOrigins.join(','),
        destination_airport: allDestinations.join(','),
        start_date: startDate,
        end_date: endDate,
        take: '1000',
        include_trips: 'true',
        only_direct_flights: 'true',
      });
      if (cabin) searchParams.append('cabin', cabin);
      if (carriers) searchParams.append('carriers', carriers);
      if (skip > 0) searchParams.append('skip', skip.toString());
      if (cursor) searchParams.append('cursor', cursor);

      // Fetch from external API (use /partnerapi/search)
      const response = await fetch(`https://seats.aero/partnerapi/search?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Partner-Authorization': apiKey,
        },
      });
      if (!response.ok) {
        throw new Error(`Seats.aero API Error: ${response.statusText}`);
      }
      const data = await response.json();

      // Process and buffer each item
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        for (const item of data.data) {
          if (uniqueItems.has(item.ID)) continue;
          const baseObject: any = {
            originAirport: item.Route.OriginAirport,
            destinationAirport: item.Route.DestinationAirport,
            date: item.Date,
            distance: item.Route.Distance,
          };

          // Process AvailabilityTrips if present
          if (item.AvailabilityTrips && Array.isArray(item.AvailabilityTrips) && item.AvailabilityTrips.length > 0) {
            let earliestDeparture = item.AvailabilityTrips[0].DepartsAt || '';
            let latestArrival = item.AvailabilityTrips[0].ArrivesAt || '';
            const flightNumberGroups: Record<string, any> = {};
            item.AvailabilityTrips.forEach((trip: any) => {
              if (!trip.FlightNumbers) return;
              if (trip.DepartsAt && (!earliestDeparture || trip.DepartsAt < earliestDeparture)) {
                earliestDeparture = trip.DepartsAt;
              }
              if (trip.ArrivesAt && (!latestArrival || trip.ArrivesAt > latestArrival)) {
                latestArrival = trip.ArrivesAt;
              }
              const flightNumberKey = trip.FlightNumbers;
              if (!flightNumberGroups[flightNumberKey]) {
                flightNumberGroups[flightNumberKey] = {
                  FlightNumbers: (trip.FlightNumbers || '').split(/,\s*/),
                  TotalDuration: trip.TotalDuration || 0,
                  Stops: trip.Stops || 0,
                  Aircraft: Array.isArray(trip.Aircraft) ? trip.Aircraft : [],
                  DepartsAt: trip.DepartsAt || '',
                  ArrivesAt: trip.ArrivesAt || '',
                  YMile: 0,
                  WMile: 0,
                  JMile: 0,
                  FMile: 0,
                };
              }
              const cabinType = (trip.Cabin || '').toLowerCase();
              if (cabinType === 'economy') {
                flightNumberGroups[flightNumberKey].YMile = trip.MileageCost || 0;
              } else if (cabinType === 'premium') {
                flightNumberGroups[flightNumberKey].WMile = trip.MileageCost || 0;
              } else if (cabinType === 'business') {
                flightNumberGroups[flightNumberKey].JMile = trip.MileageCost || 0;
              } else if (cabinType === 'first') {
                flightNumberGroups[flightNumberKey].FMile = trip.MileageCost || 0;
              }
            });
            baseObject.AvailabilityTrips = Object.values(flightNumberGroups);
            baseObject.earliestDeparture = earliestDeparture;
            baseObject.latestArrival = latestArrival;
          } else {
            baseObject.AvailabilityTrips = [];
            baseObject.earliestDeparture = '';
            baseObject.latestArrival = '';
          }
          uniqueItems.set(item.ID, true);
          processedCount++;
          results.push(baseObject);
        }
      }
      hasMore = data.hasMore || false;
      if (hasMore) {
        skip += 1000;
        cursor = data.cursor;
      }
    }
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error in /api/availability-v2:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 