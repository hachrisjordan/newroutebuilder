import { NextRequest, NextResponse } from 'next/server';
import { ShortestRouteChallenge, ShortestRouteGuess, Alliance } from '@/types/shortest-route';
import { Path } from '@/types/route';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import Valkey from 'iovalkey';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const alliances: Alliance[] = ['ST', 'SA', 'OW'];
const STOP_TYPES = { 2: 'A-H-H-B' } as const;

// Valkey setup
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

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: Get all (origin, destination, alliance) combos with >10 routes for 2-stop only
async function getRandomChallengeFromDB(mode: 'daily' | 'practice') {
  for (let attempt = 0; attempt < 10; attempt++) {
    const alliance = getRandomElement(alliances);
    const type = STOP_TYPES[2];
    // Fetch all paths for this alliance and 2-stop
    const { data, error } = await supabase
      .from('path')
      .select('origin, destination, id')
      .eq('alliance', alliance)
      .eq('type', type);
    if (error || !data) continue;
    // Aggregate in JS: count (origin, destination) pairs
    const pairCounts: Record<string, { origin: string; destination: string; count: number }> = {};
    for (const row of data as { origin: string; destination: string }[]) {
      const key = `${row.origin}-${row.destination}`;
      if (!pairCounts[key]) {
        pairCounts[key] = { origin: row.origin, destination: row.destination, count: 0 };
      }
      pairCounts[key].count++;
    }
    const candidates = Object.values(pairCounts).filter((row) => row.count > 10);
    if (candidates.length === 0) continue;
    const { origin, destination } = getRandomElement(candidates);
    // Find all shortest routes for this combo
    const { data: routes, error: routeErr } = await supabase
      .from('path')
      .select('*')
      .eq('alliance', alliance)
      .eq('type', type)
      .eq('origin', origin)
      .eq('destination', destination)
      .order('totalDistance', { ascending: true });
    if (routeErr || !routes || routes.length === 0) continue;
    const minDistance = routes[0].totalDistance;
    const shortestRoutes = routes.filter(r => r.totalDistance === minDistance);
    const shortestRoute = [origin, shortestRoutes[0].h1, shortestRoutes[0].h2, destination];
    // Collect all shortest hub sequences
    const allShortestHubSeqs = shortestRoutes.map(r => [r.h1, r.h2]);
    return {
      id: `${origin}-${destination}-${alliance}-2`,
      origin,
      destination,
      alliance,
      stopCount: 2,
      shortestRoute,
      shortestRoutes: allShortestHubSeqs, // <-- new field
      shortestDistance: minDistance,
      tries: 8,
      mode,
    } satisfies ShortestRouteChallenge;
  }
  throw new Error('No valid challenge found');
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const mode = (url.searchParams.get('mode') === 'daily') ? 'daily' : 'practice';
    if (mode === 'practice') {
      const challenge = await getRandomChallengeFromDB('practice');
      return NextResponse.json({ challenge });
    }
    // Daily mode: use Valkey cache
    const client = getValkeyClient();
    const today = new Date();
    const todayKey = `shortest_route_2_${today.toISOString().split('T')[0]}`;
    if (client) {
      try {
        const cached = await client.get(todayKey);
        if (cached) {
          const challenge = JSON.parse(cached);
          return NextResponse.json({ challenge });
        }
      } catch (error) {
        console.error('Valkey error:', error);
      }
    }
    // Not cached: generate, cache, and return
    const challenge = await getRandomChallengeFromDB('daily');
    if (client) {
      try {
        // Set TTL to expire at midnight UTC tomorrow
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        const ttlSeconds = Math.floor((tomorrow.getTime() - today.getTime()) / 1000);
        await client.setex(todayKey, ttlSeconds, JSON.stringify(challenge));
      } catch (error) {
        console.error('Valkey cache error:', error);
      }
    }
    return NextResponse.json({ challenge });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to generate challenge' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { hubs, challengeId } = body;
  const [origin, destination, alliance] = challengeId.split('-');
  const type = STOP_TYPES[2];
  let query = supabase
    .from('path')
    .select('*')
    .eq('alliance', alliance)
    .eq('type', type)
    .eq('origin', origin)
    .eq('destination', destination)
    .eq('h1', hubs[0])
    .eq('h2', hubs[1]);
  const { data: matches, error } = await query.limit(1);
  let guess: ShortestRouteGuess;
  if (error) {
    guess = {
      hubs,
      isValid: false,
      error: 'Database error',
    };
    return NextResponse.json({ guess });
  }
  if (!matches || matches.length === 0) {
    guess = {
      hubs,
      isValid: false,
      error: 'Invalid route',
    };
    return NextResponse.json({ guess });
  }
  const { data: shortestArr } = await supabase
    .from('path')
    .select('totalDistance')
    .eq('alliance', alliance)
    .eq('type', type)
    .eq('origin', origin)
    .eq('destination', destination)
    .order('totalDistance', { ascending: true })
    .limit(1);
  const shortestDistance = shortestArr && shortestArr[0]?.totalDistance;
  const totalDistance = matches[0].totalDistance;
  guess = {
    hubs,
    isValid: true,
    totalDistance,
    differenceFromShortest: shortestDistance !== undefined ? totalDistance - shortestDistance : undefined,
  };
  return NextResponse.json({ guess });
} 