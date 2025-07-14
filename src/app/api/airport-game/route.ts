import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Valkey from 'iovalkey';
import { startOfDay, endOfDay } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

interface Airport {
  iata: string;
  name: string;
  city_name: string;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
}

export async function GET() {
  try {
    const client = getValkeyClient();
    const today = new Date();
    const todayKey = `airport_game_${today.toISOString().split('T')[0]}`;
    
    // Check if we have a cached airport for today
    if (client) {
      try {
        const cachedAirport = await client.get(todayKey);
        if (cachedAirport) {
          const airport = JSON.parse(cachedAirport);
          return NextResponse.json({ airport });
        }
      } catch (error) {
        console.error('Redis error:', error);
      }
    }

    // Fetch a random international airport from Supabase
    const { data, error } = await supabase
      .from('airports')
      .select('iata, name, city_name, country, country_code, latitude, longitude')
      .or('name.ilike.%international%,name.ilike.%intl%')
      .limit(1000);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch airports' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No international airports found' }, { status: 404 });
    }

    // Select a random airport
    const randomIndex = Math.floor(Math.random() * data.length);
    const airport = data[randomIndex];

    // Cache the airport for today
    if (client) {
      try {
        // Set TTL to expire at midnight UTC tomorrow
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        const ttlSeconds = Math.floor((tomorrow.getTime() - today.getTime()) / 1000);
        
        await client.setex(todayKey, ttlSeconds, JSON.stringify(airport));
      } catch (error) {
        console.error('Redis cache error:', error);
      }
    }

    return NextResponse.json({ airport });
  } catch (error) {
    console.error('Airport game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 