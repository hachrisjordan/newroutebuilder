export interface AirportRecord {
  iata: string;
  name: string;
  city_name: string;
  country: string;
}

export interface SearchAirportsResponse {
  airports: AirportRecord[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Fetch airports from the backend API (Next.js route).
 * This helper is intentionally simple – it performs no caching so that callers
 * can decide when and how to memoise results.
 */
export async function searchAirports(
  search: string,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchAirportsResponse> {
  const params = new URLSearchParams({
    search,
    page: String(page),
    pageSize: String(pageSize),
  });

  const res = await fetch(`/api/airports?${params.toString()}`, {
    // Disable Next.js caching for client-side search requests.
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch airports: ${res.status} ${res.statusText}`);
  }

  // The API already returns validated data – simply forward the JSON.
  return (await res.json()) as SearchAirportsResponse;
}