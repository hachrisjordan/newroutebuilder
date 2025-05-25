import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const AirportSchema = z.object({
  iata: z.string(),
  name: z.string(),
  city_name: z.string(),
  country: z.string(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('airports')
      .select('iata, name, city_name, country', { count: 'exact' })
      .order('city_name', { ascending: true });

    if (search) {
      query = query.or(`iata.ilike.%${search}%,city_name.ilike.%${search}%,country.ilike.%${search}%`);
    }

    const { data, count, error } = await query.range(from, to);
    if (error) throw error;
    if (!data) return NextResponse.json({ airports: [], total: 0, page, pageSize });

    // Validate data
    const airports = z.array(AirportSchema).parse(data);

    return NextResponse.json({
      airports,
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Zod validation error:', error.errors);
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 500 }
      );
    }
    console.error('Failed to fetch airports:', error);
    const message = typeof error === 'object' && error && 'message' in error ? (error.message as string) : String(error);
    return NextResponse.json(
      { error: message || 'Failed to fetch airports' },
      { status: 500 }
    );
  }
} 