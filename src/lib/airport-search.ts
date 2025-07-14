import { z } from 'zod';

export interface AirportOption {
  value: string;
  label: string;
  data: {
    city_name: string;
    country: string;
  };
}

const AirportSchema = z.object({
  iata: z.string(),
  name: z.string(),
  city_name: z.string(),
  country: z.string(),
});

export async function searchAirports({
  search = '',
  page = 1,
  pageSize = 20,
}: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ options: AirportOption[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams({
    search,
    page: String(page),
    pageSize: String(pageSize),
  });
  const res = await fetch(`/api/airports?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch airports');
  const data = await res.json();
  const airports = z.array(AirportSchema).parse(data.airports);
  const options: AirportOption[] = airports.map((airport) => ({
    value: airport.iata,
    label: `${airport.iata} - ${airport.city_name} (${airport.country})`,
    data: {
      city_name: airport.city_name,
      country: airport.country,
    },
  }));
  return {
    options,
    total: data.total ?? 0,
    page: data.page ?? 1,
    pageSize: data.pageSize ?? pageSize,
  };
}