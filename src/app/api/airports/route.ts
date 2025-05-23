import { NextResponse } from 'next/server';
import airports from '@/data/airports.json';

interface Airport {
  iata: string;
  name: string;
  cityName: string;
  country: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Transform and filter airports
    const transformedAirports = (airports as any[])
      .map(airport => ({
        iata: airport.IATA,
        name: airport.Name,
        cityName: airport.CityName,
        country: airport.Country
      }))
      .filter(airport => {
        if (!search) return true;
        return (
          airport.iata.toLowerCase().includes(search) ||
          airport.cityName.toLowerCase().includes(search) ||
          airport.country.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        // If searching, prioritize exact matches and starts with
        if (search) {
          const aStartsWith = a.iata.toLowerCase().startsWith(search) ? 1 : 0;
          const bStartsWith = b.iata.toLowerCase().startsWith(search) ? 1 : 0;
          if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;
        }
        return a.cityName.localeCompare(b.cityName);
      });

    // Calculate pagination
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedAirports = transformedAirports.slice(start, end);

    return NextResponse.json({
      airports: paginatedAirports,
      total: transformedAirports.length,
      page,
      pageSize
    });
  } catch (error) {
    console.error('Failed to fetch airports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch airports' },
      { status: 500 }
    );
  }
} 