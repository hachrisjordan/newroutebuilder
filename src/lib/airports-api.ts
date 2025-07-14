interface Airport {
  iata: string;
  name: string;
  city_name: string;
  country: string;
}

interface AirportsResponse {
  airports: Airport[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchAirports(search = '', page = 1, pageSize = 100): Promise<AirportsResponse> {
  const params = new URLSearchParams({
    search,
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  const response = await fetch(`/api/airports?${params}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch airports');
  }
  
  return response.json();
}

export async function searchAirports(query: string): Promise<Airport[]> {
  if (!query || query.length < 2) return [];
  
  try {
    const result = await fetchAirports(query, 1, 20);
    return result.airports;
  } catch (error) {
    console.error('Error searching airports:', error);
    return [];
  }
}