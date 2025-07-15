import { NextRequest, NextResponse } from 'next/server';
import { ShortestRouteChallenge, ShortestRouteGuess, Alliance } from '@/types/shortest-route';
import { Path } from '@/types/route';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const alliances: Alliance[] = ['ST', 'SA', 'OW'];
const STOP_TYPES = { 1: 'A-H-B', 2: 'A-H-H-B' } as const;

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: Get all (origin, destination, alliance, stopCount) combos with >10 routes
async function getRandomChallengeFromDB(stopCount: 1 | 2) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const alliance = getRandomElement(alliances);
    const type = STOP_TYPES[stopCount];
    // Fetch all paths for this alliance and stopCount
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
    // Find the shortest route for this combo
    const { data: routes, error: routeErr } = await supabase
      .from('path')
      .select('*')
      .eq('alliance', alliance)
      .eq('type', type)
      .eq('origin', origin)
      .eq('destination', destination)
      .order('totalDistance', { ascending: true })
      .limit(1);
    if (routeErr || !routes || routes.length === 0) continue;
    const shortest = routes[0];
    const shortestRoute = [origin];
    if (stopCount === 1 && shortest.h1) shortestRoute.push(shortest.h1);
    if (stopCount === 2 && shortest.h1 && shortest.h2) {
      shortestRoute.push(shortest.h1, shortest.h2);
    }
    shortestRoute.push(destination);
    return {
      id: `${origin}-${destination}-${alliance}-${stopCount}`,
      origin,
      destination,
      alliance,
      stopCount: stopCount as 1 | 2,
      shortestRoute,
      shortestDistance: shortest.totalDistance,
      tries: stopCount === 1 ? 6 : 8,
      mode: 'practice',
    } satisfies ShortestRouteChallenge;
  }
  throw new Error('No valid challenge found');
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const stopCountParam = url.searchParams.get('stopCount');
    let stopCount: 1 | 2 = 2;
    if (stopCountParam === '1') stopCount = 1;
    else if (stopCountParam === '2') stopCount = 2;
    // mode param is accepted but only 'practice' is supported for now
    const challenge = await getRandomChallengeFromDB(stopCount);
    return NextResponse.json({ challenge });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to generate challenge' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { hubs, challengeId } = body;
  const [origin, destination, alliance, stopCountStr] = challengeId.split('-');
  const stopCount = parseInt(stopCountStr, 10);
  const type = STOP_TYPES[stopCount as 1 | 2];
  let query = supabase
    .from('path')
    .select('*')
    .eq('alliance', alliance)
    .eq('type', type)
    .eq('origin', origin)
    .eq('destination', destination);
  if (stopCount === 1) {
    query = query.eq('h1', hubs[0]);
  } else if (stopCount === 2) {
    query = query.eq('h1', hubs[0]).eq('h2', hubs[1]);
  }
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
      error: 'No such route for this alliance',
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