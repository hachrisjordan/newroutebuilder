import { NextRequest, NextResponse } from 'next/server';
import { createFullRoutePathSchema } from './schema';
import { createClient } from '@supabase/supabase-js';
import { getHaversineDistance, fetchAirportByIata, fetchPaths, fetchIntraRoutes, SupabaseClient } from '@/lib/route-helpers';
import { FullRoutePathResult, Path, IntraRoute } from '@/types/route';

// Use environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    // 1. Validate input
    const body = await req.json();
    const parseResult = createFullRoutePathSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: parseResult.error.errors }, { status: 400 });
    }
    const { origin, destination } = parseResult.data;

    // 2. Create Supabase client
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

    // 3. Fetch airport info
    const [originAirport, destinationAirport] = await Promise.all([
      fetchAirportByIata(supabase, origin),
      fetchAirportByIata(supabase, destination),
    ]);
    if (!originAirport || !destinationAirport) {
      return NextResponse.json({ error: 'Origin or destination airport not found' }, { status: 404 });
    }

    // 4. Calculate direct distance
    const directDistance = getHaversineDistance(
      originAirport.latitude,
      originAirport.longitude,
      destinationAirport.latitude,
      destinationAirport.longitude
    );
    const maxDistance = 2 * directDistance;

    // 5. Get regions
    const originRegion = originAirport.region;
    const destinationRegion = destinationAirport.region;

    // 6. Fetch candidate paths
    const paths = await fetchPaths(supabase, originRegion, destinationRegion, maxDistance);

    // 7. Case 1: Direct path
    const case1 = paths.find(
      (p) => p.origin === origin && p.destination === destination
    );
    const results: FullRoutePathResult[] = [];
    if (case1) {
      results.push({
        O: null,
        A: origin,
        h1: case1.h1 ?? null,
        h2: case1.h2 ?? null,
        B: destination,
        D: null,
        all1: null,
        all2: case1.alliance,
        all3: null,
        cumulativeDistance: case1.totalDistance,
        caseType: 'case1',
      });
    }

    // 8. Case 2A: path.destination === destination, path.origin != origin
    for (const p of paths.filter((p) => p.destination === destination && p.origin !== origin)) {
      const intra = (await fetchIntraRoutes(supabase, origin, p.origin)).find(
        (ir) => ir.Origin === origin && ir.Destination === p.origin
      );
      if (intra) {
        const cumulativeDistance = p.totalDistance + intra.Distance;
        if (cumulativeDistance <= maxDistance) {
          results.push({
            O: origin,
            A: p.origin,
            h1: p.h1 ?? null,
            h2: p.h2 ?? null,
            B: destination,
            D: null,
            all1: intra.Alliance,
            all2: p.alliance,
            all3: null,
            cumulativeDistance,
            caseType: 'case2A',
          });
        }
      }
    }

    // 9. Case 2B: path.origin === origin, path.destination != destination
    for (const p of paths.filter((p) => p.origin === origin && p.destination !== destination)) {
      const intra = (await fetchIntraRoutes(supabase, p.destination, destination)).find(
        (ir) => ir.Origin === p.destination && ir.Destination === destination
      );
      if (intra) {
        const cumulativeDistance = p.totalDistance + intra.Distance;
        if (cumulativeDistance <= maxDistance) {
          results.push({
            O: null,
            A: origin,
            h1: p.h1 ?? null,
            h2: p.h2 ?? null,
            B: p.destination,
            D: destination,
            all1: null,
            all2: p.alliance,
            all3: intra.Alliance,
            cumulativeDistance,
            caseType: 'case2B',
          });
        }
      }
    }

    // 10. Case 3: path.origin != origin && path.destination != destination
    for (const p of paths.filter((p) => p.origin !== origin && p.destination !== destination)) {
      const intraLeft = (await fetchIntraRoutes(supabase, origin, p.origin)).find(
        (ir) => ir.Origin === origin && ir.Destination === p.origin
      );
      const intraRight = (await fetchIntraRoutes(supabase, p.destination, destination)).find(
        (ir) => ir.Origin === p.destination && ir.Destination === destination
      );
      if (intraLeft && intraRight) {
        const cumulativeDistance = p.totalDistance + intraLeft.Distance + intraRight.Distance;
        if (cumulativeDistance <= maxDistance) {
          results.push({
            O: origin,
            A: p.origin,
            h1: p.h1 ?? null,
            h2: p.h2 ?? null,
            B: p.destination,
            D: destination,
            all1: intraLeft.Alliance,
            all2: p.alliance,
            all3: intraRight.Alliance,
            cumulativeDistance,
            caseType: 'case3',
          });
        }
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ error: 'No valid route found' }, { status: 404 });
    }
    return NextResponse.json({ routes: results });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error', details: (err as Error).message }, { status: 500 });
  }
} 