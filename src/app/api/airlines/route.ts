import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALLOWED_AIRLINES = [
  'EI', 'LX', 'UX', 'WS', 'VJ', 'DE', '4Y', 'WK', 'EW', 'FI', 'AZ', 'HO', 'VA',
  'EN', 'CZ', 'DL', 'HA', 'B6', 'AA', 'UA', 'NK', 'F9', 'G4', 'AS', 'A3', 'NZ',
  'OZ', 'MS', 'SA', 'TP', 'SN', 'AV', 'OU', 'MX', 'ME', 'KQ', 'MF', 'RO', 'AR',
  'AM', 'SK', 'ZH', 'LA', 'AY', 'JX', 'FJ', 'KL', 'RJ', 'UL', 'AT', 'AC', 'LO',
  'IB', 'CA', 'MU', 'TK', 'GA', 'MH', 'JL', 'NH', 'QR', 'AF', 'LH', 'BA', 'SQ',
  'EK', 'KE', 'AI', 'EY', 'TG', 'QF', 'CX', 'VN', 'CI', 'BR', 'VS', 'SV', 'CM',
  'ET', 'PR', 'OS'
];

export async function GET() {
  try {
    const airlines = await prisma.airline.findMany({
      where: {
        code: {
          in: ALLOWED_AIRLINES
        }
      },
      select: {
        code: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Add logo path to each airline
    const airlinesWithLogos = airlines.map(airline => ({
      ...airline,
      logo: `/${airline.code}.png`
    }));

    return NextResponse.json(airlinesWithLogos);
  } catch (error) {
    console.error('Failed to fetch airlines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch airlines' },
      { status: 500 }
    );
  }
} 