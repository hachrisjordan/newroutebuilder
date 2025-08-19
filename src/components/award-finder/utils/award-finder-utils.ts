// Utility functions for award finder results component

// Cache interface for live search results
export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // 30 minutes in milliseconds
}

// In-memory cache for live search results (fallback if Valkey not available)
export const liveSearchCache = new Map<string, CacheEntry>();
export const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

// Helper to parse ISO string as local time (ignore Z)
export function parseLocalTime(iso: string): Date {
  return new Date(iso.replace(/Z$/, ''));
}

export const formatTime = (iso: string) => {
  const date = parseLocalTime(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const getDayDiff = (baseDate: string, compareIso: string) => {
  // baseDate: 'YYYY-MM-DD', compareIso: ISO string
  const base = new Date(baseDate + 'T00:00:00Z');
  const compare = new Date(compareIso);
  // Calculate UTC day difference
  const diff = Math.floor((compare.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

export const getAirlineCode = (flightNumber: string) => flightNumber.slice(0, 2).toUpperCase();

export const classBarColors: Record<string, string> = {
  Y: 'bg-[#E8E1F2]',
  W: 'bg-[#B8A4CC]',
  J: 'bg-[#F3CD87]',
  F: 'bg-[#D88A3F]',
};

// Add a helper for layover duration formatting
export const formatLayoverDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

export function getLocalDayDiff(baseDate: string, iso: string): number {
  // baseDate: 'YYYY-MM-DD', iso: 'YYYY-MM-DDTHH:mm:ssZ'
  const base = new Date(baseDate);
  const compare = parseLocalTime(iso);
  // Use only the date part, ignore timezones
  const baseYMD = `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`;
  const compareYMD = `${compare.getFullYear()}-${String(compare.getMonth()+1).padStart(2,'0')}-${String(compare.getDate()).padStart(2,'0')}`;
  const baseDateObj = new Date(baseYMD);
  const compareDateObj = new Date(compareYMD);
  return Math.floor((compareDateObj.getTime() - baseDateObj.getTime()) / (1000 * 60 * 60 * 24));
}

// Helper to get local date string from ISO
export function getFlightLocalDate(iso: string): string {
  return formatYMD(parseLocalTime(iso));
}

// Helper to format a Date as YYYY-MM-DD
export function formatYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// Cache key generator for live search
export function generateCacheKey(program: string, from: string, to: string, depart: string, seats: number): string {
  return `live-search:${program}:${from}:${to}:${depart}:${seats}`;
}

// Check if cache entry is still valid
export function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

// Get cached result if available and valid
export function getCachedResult(cacheKey: string): any | null {
  const entry = liveSearchCache.get(cacheKey);
  if (entry && isCacheValid(entry)) {
    console.log(`Cache hit for: ${cacheKey}`);
    return entry.data;
  }
  if (entry && !isCacheValid(entry)) {
    console.log(`Cache expired for: ${cacheKey}`);
    liveSearchCache.delete(cacheKey);
  }
  return null;
}

// Cache result with TTL
export function cacheResult(cacheKey: string, data: any): void {
  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL
  };
  liveSearchCache.set(cacheKey, entry);
  console.log(`Cached result for: ${cacheKey}`);
}

// Minimal, robust helpers for local date and day diff
export function parseLocalDateFromIso(iso: string): string {
  // Remove Z, parse as local, and return YYYY-MM-DD
  const d = new Date(iso.replace(/Z$/, ''));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function getDayDiffFromItinerary(itineraryDate: string, iso: string): number {
  const itinerary = new Date(itineraryDate);
  const flightDate = new Date(parseLocalDateFromIso(iso));
  return Math.floor((flightDate.getTime() - itinerary.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatIsoTime(iso: string) {
  // Returns 'HH:mm' from ISO string, without local time conversion
  const [, time] = iso.split('T');
  return time ? time.slice(0, 5) : '';
}

// Function to find matching flights by flight number
export function findMatchingFlights(liveSearchData: any, cardFlights: any[], route: string) {
  if (!liveSearchData?.itinerary) return [];
  
  const matchingFlights = [];
  
  for (const itinerary of liveSearchData.itinerary) {
    for (const segment of itinerary.segments) {
      const flightNumber = segment.flightnumber;
      
      // Find matching flight in original card flights
      const matchingFlight = cardFlights.find(flight => 
        flight.FlightNumbers === flightNumber
      );
      
      if (matchingFlight) {
        matchingFlights.push({
          segment,
          originalFlight: matchingFlight,
          route,
          pricing: itinerary.bundles
        });
      }
    }
  }
  
  return matchingFlights;
}