// Efficient data loading utilities
let airlinesCache: any = null;
let airportsCache: any = null;

export async function getAirlines() {
  if (airlinesCache) {
    return airlinesCache;
  }
  
  // Lazy load airlines data
  const { default: airlines } = await import('../data/airlines_full');
  airlinesCache = airlines;
  return airlines;
}

export async function getAirports() {
  if (airportsCache) {
    return airportsCache;
  }
  
  // Lazy load airports data only when needed
  const { default: airports } = await import('../data/airports.json');
  airportsCache = airports;
  return airports;
}

// Preload critical data
export function preloadCriticalData() {
  // Only preload smaller, critical data
  import('../data/airlines_full');
}

// Clear cache if needed (for development)
export function clearDataCache() {
  airlinesCache = null;
  airportsCache = null;
}