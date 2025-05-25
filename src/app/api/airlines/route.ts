import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const ALLOWED_AIRLINES = [
  'EI', 'LX', 'UX', 'WS', 'VJ', 'DE', '4Y', 'WK', 'EW', 'FI', 'AZ', 'HO', 'VA',
  'EN', 'CZ', 'DL', 'HA', 'B6', 'AA', 'UA', 'NK', 'F9', 'G4', 'AS', 'A3', 'NZ',
  'OZ', 'MS', 'SA', 'TP', 'SN', 'AV', 'OU', 'MX', 'ME', 'KQ', 'MF', 'RO', 'AR',
  'AM', 'SK', 'ZH', 'LA', 'AY', 'JX', 'FJ', 'KL', 'RJ', 'UL', 'AT', 'AC', 'LO',
  'IB', 'CA', 'MU', 'TK', 'GA', 'MH', 'JL', 'NH', 'QR', 'AF', 'LH', 'BA', 'SQ',
  'EK', 'KE', 'AI', 'EY', 'TG', 'QF', 'CX', 'VN', 'CI', 'BR', 'VS', 'SV', 'CM',
  'ET', 'PR', 'OS'
];

const AirlineSchema = z.object({
  code: z.string(),
  name: z.string(),
});

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('airlines')
      .select('code, name')
      .in('code', ALLOWED_AIRLINES)
      .order('name', { ascending: true });
    if (error) throw error;
    if (!data) return NextResponse.json([]);

    // Validate data
    const airlines = z.array(AirlineSchema).parse(data);

    // Add logo path to each airline
    const airlinesWithLogos = airlines.map(airline => ({
      ...airline,
      logo: `/${airline.code}.png`,
    }));

    return NextResponse.json(airlinesWithLogos);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Zod validation error:', error.errors);
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 500 }
      );
    }
    console.error('Failed to fetch airlines:', error);
    const message = typeof error === 'object' && error && 'message' in error ? (error.message as string) : String(error);
    return NextResponse.json(
      { error: message || 'Failed to fetch airlines' },
      { status: 500 }
    );
  }
} 