import { NextRequest, NextResponse } from 'next/server';
import { createFullRoutePathSchema } from './schema';
import { createClient } from '@supabase/supabase-js';
import { getHaversineDistance, fetchAirportByIata, fetchPaths, fetchIntraRoutes, SupabaseClient } from '@/lib/route-helpers';
import { FullRoutePathResult, Path, IntraRoute } from '@/types/route';
import Valkey from 'iovalkey';

// Use environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// --- Valkey (iovalkey) setup ---
let valkey: any = null;
function getValkeyClient(): any {
  if (valkey) return valkey;
  const host = process.env.VALKEY_HOST;
  const port = process.env.VALKEY_PORT ? parseInt(process.env.VALKEY_PORT, 10) : 6379;
  const password = process.env.VALKEY_PASSWORD;
  if (!host) return null;
  valkey = new Valkey({ host, port, password });
  return valkey;
}

/**
 * Get cached route result from Valkey.
 */
async function getCachedRoute(origin: string, destination: string): Promise<FullRoutePathResult[] | null> {
  const client = getValkeyClient();
  if (!client) return null;
  try {
    const key = `route:${origin}:${destination}`;
    const cached = await client.get(key);
    if (cached) {
      return JSON.parse(cached) as FullRoutePathResult[];
    }
    return null;
  } catch (err) {
    console.error('Valkey cache get error:', err);
    return null;
  }
}

/**
 * Set cached route result in Valkey with TTL (15 min).
 */
async function setCachedRoute(origin: string, destination: string, data: FullRoutePathResult[]): Promise<void> {
  const client = getValkeyClient();
  if (!client) return;
  try {
    const key = `route:${origin}:${destination}`;
    await client.set(key, JSON.stringify(data), 'EX', 900); // 900s = 15min
  } catch (err) {
    console.error('Valkey cache set error:', err);
  }
}

// Helper function to batch fetch intra routes
async function batchFetchIntraRoutes(supabase: SupabaseClient, pairs: { origin: string; destination: string }[]) {
  const uniquePairs = Array.from(new Set(pairs.map(p => `${p.origin}-${p.destination}`)));
  const allRoutes = await fetchIntraRoutes(supabase, '', '');
  return uniquePairs.map(pair => {
    const [origin, destination] = pair.split('-');
    return allRoutes.find(ir => ir.Origin === origin && ir.Destination === destination);
  }).filter(Boolean) as IntraRoute[];
}

export async function POST(req: NextRequest) {
  const startTime = performance.now();
  try {
    // 1. Validate input
    const validationStart = performance.now();
    const body = await req.json();
    const parseResult = createFullRoutePathSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: parseResult.error.errors }, { status: 400 });
    }
    const { origin, destination } = parseResult.data;
    console.log(`Input validation took: ${(performance.now() - validationStart).toFixed(2)}ms`);

    // 1.5. Try cache first
    const cacheStart = performance.now();
    const cached = await getCachedRoute(origin, destination);
    if (cached) {
      console.log(`Cache hit for ${origin}-${destination} (took ${(performance.now() - cacheStart).toFixed(2)}ms)`);
      return NextResponse.json({ routes: cached, cached: true });
    }
    console.log(`Cache miss for ${origin}-${destination} (took ${(performance.now() - cacheStart).toFixed(2)}ms)`);

    // 2. Create Supabase client
    const clientStart = performance.now();
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log(`Supabase client creation took: ${(performance.now() - clientStart).toFixed(2)}ms`);

    // 3. Fetch airport info
    const airportStart = performance.now();
    const [originAirport, destinationAirport] = await Promise.all([
      fetchAirportByIata(supabase, origin),
      fetchAirportByIata(supabase, destination),
    ]);
    if (!originAirport || !destinationAirport) {
      return NextResponse.json({ error: 'Origin or destination airport not found' }, { status: 404 });
    }
    console.log(`Airport info fetch took: ${(performance.now() - airportStart).toFixed(2)}ms`);

    // 4. Calculate direct distance
    const distanceStart = performance.now();
    const directDistance = getHaversineDistance(
      originAirport.latitude,
      originAirport.longitude,
      destinationAirport.latitude,
      destinationAirport.longitude
    );
    const maxDistance = 2 * directDistance;
    console.log(`Distance calculation took: ${(performance.now() - distanceStart).toFixed(2)}ms`);

    // 5. Get regions
    const regionStart = performance.now();
    const originRegion = originAirport.region;
    const destinationRegion = destinationAirport.region;
    console.log(`Region extraction took: ${(performance.now() - regionStart).toFixed(2)}ms`);

    // 6. Fetch candidate paths
    const pathsStart = performance.now();
    const paths = await fetchPaths(supabase, originRegion, destinationRegion, maxDistance);
    console.log(`Paths fetch took: ${(performance.now() - pathsStart).toFixed(2)}ms`);

    // 7. Case 1: Direct path
    const case1Start = performance.now();
    const case1Paths = paths.filter(
      (p) => p.origin === origin && p.destination === destination
    );
    const results: FullRoutePathResult[] = [];
    for (const p of case1Paths) {
      results.push({
        O: null,
        A: origin,
        h1: p.h1 ?? null,
        h2: p.h2 ?? null,
        B: destination,
        D: null,
        all1: null,
        all2: p.alliance,
        all3: null,
        cumulativeDistance: p.totalDistance,
        caseType: 'case1',
      });
    }
    console.log(`Case 1 processing took: ${(performance.now() - case1Start).toFixed(2)}ms`);

    // 8. Case 2A: path.destination === destination, path.origin != origin
    const case2AStart = performance.now();
    const case2APaths = paths.filter((p) => p.destination === destination && p.origin !== origin);
    if (case2APaths.length > 0) {
      const intraRoutes = await batchFetchIntraRoutes(supabase, 
        case2APaths.map(p => ({ origin, destination: p.origin }))
      );
      
      for (const p of case2APaths) {
        const intraMatches = intraRoutes.filter(ir => ir.Origin === origin && ir.Destination === p.origin);
        for (const intra of intraMatches) {
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
    }
    console.log(`Case 2A processing took: ${(performance.now() - case2AStart).toFixed(2)}ms`);

    // 9. Case 2B: path.origin === origin, path.destination != destination
    const case2BStart = performance.now();
    const case2BPaths = paths.filter((p) => p.origin === origin && p.destination !== destination);
    if (case2BPaths.length > 0) {
      const intraRoutes = await batchFetchIntraRoutes(supabase,
        case2BPaths.map(p => ({ origin: p.destination, destination }))
      );

      for (const p of case2BPaths) {
        const intraMatches = intraRoutes.filter(ir => ir.Origin === p.destination && ir.Destination === destination);
        for (const intra of intraMatches) {
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
    }
    console.log(`Case 2B processing took: ${(performance.now() - case2BStart).toFixed(2)}ms`);

    // 10. Case 3: path.origin != origin && path.destination != destination
    const case3Start = performance.now();
    const case3Paths = paths.filter((p) => p.origin !== origin && p.destination !== destination);
    if (case3Paths.length > 0) {
      // Prepare all pairs for batch fetching
      const allPairs = case3Paths.flatMap(p => [
        { origin, destination: p.origin },
        { origin: p.destination, destination }
      ]);
      
      const intraRoutes = await batchFetchIntraRoutes(supabase, allPairs);

      for (const p of case3Paths) {
        const intraLeftMatches = intraRoutes.filter(ir => ir.Origin === origin && ir.Destination === p.origin);
        const intraRightMatches = intraRoutes.filter(ir => ir.Origin === p.destination && ir.Destination === destination);
        for (const intraLeft of intraLeftMatches) {
          for (const intraRight of intraRightMatches) {
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
      }
    }
    console.log(`Case 3 processing took: ${(performance.now() - case3Start).toFixed(2)}ms`);

    if (results.length === 0) {
      return NextResponse.json({ error: 'No valid route found' }, { status: 404 });
    }

    // Store in cache (fire and forget)
    setCachedRoute(origin, destination, results).catch((err) => {
      console.error('Valkey cache set error (non-blocking):', err);
    });

    // Log summary of routes in terminal, grouped by caseType, merging alternatives
    const groupByCase = results.reduce((acc, route) => {
      if (!acc[route.caseType]) acc[route.caseType] = [];
      acc[route.caseType].push(route);
      return acc;
    }, {} as Record<string, typeof results>);

    Object.entries(groupByCase).forEach(([caseType, routes]) => {
      // Group by route structure (positions)
      const structureMap = new Map<string, Record<string, Set<string>>>();
      for (const r of routes) {
        // Build structure key and collect values for each position
        const positions = [];
        if (r.O) positions.push('O');
        positions.push('A');
        if (r.h1) positions.push('h1');
        if (r.h2) positions.push('h2');
        positions.push('B');
        if (r.D) positions.push('D');
        const structureKey = positions.join('-');
        if (!structureMap.has(structureKey)) {
          structureMap.set(structureKey, {
            O: new Set(),
            A: new Set(),
            h1: new Set(),
            h2: new Set(),
            B: new Set(),
            D: new Set(),
          });
        }
        const valueMap = structureMap.get(structureKey)!;
        if (r.O) valueMap.O.add(r.O);
        valueMap.A.add(r.A);
        if (r.h1) valueMap.h1.add(r.h1);
        if (r.h2) valueMap.h2.add(r.h2);
        valueMap.B.add(r.B);
        if (r.D) valueMap.D.add(r.D);
      }
      if (structureMap.size > 0) {
        console.log(`${caseType}:`);
        for (const [structureKey, valueMap] of structureMap.entries()) {
          // Build merged pattern
          const parts: string[] = [];
          if (structureKey.includes('O')) parts.push(Array.from(valueMap.O).join('/'));
          parts.push(Array.from(valueMap.A).join('/'));
          if (structureKey.includes('h1')) parts.push(Array.from(valueMap.h1).join('/'));
          if (structureKey.includes('h2')) parts.push(Array.from(valueMap.h2).join('/'));
          parts.push(Array.from(valueMap.B).join('/'));
          if (structureKey.includes('D')) parts.push(Array.from(valueMap.D).join('/'));
          // Remove empty
          const mergedRoute = parts.filter(Boolean).join('-');
          console.log(mergedRoute);
        }
      }
    });

    console.log(`Total API execution time: ${(performance.now() - startTime).toFixed(2)}ms`);
    return NextResponse.json({ routes: results });
  } catch (err) {
    console.error(`Error occurred after ${(performance.now() - startTime).toFixed(2)}ms:`, err);
    return NextResponse.json({ error: 'Internal server error', details: (err as Error).message }, { status: 500 });
  }
} 