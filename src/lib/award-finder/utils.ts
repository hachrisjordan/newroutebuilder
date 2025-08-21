// Utility helpers for Award Finder. Pure functions only.

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const liveSearchCache = new Map<string, CacheEntry>();
export const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function generateCacheKey(program: string, from: string, to: string, depart: string, seats: number): string {
  return `live-search:${program}:${from}:${to}:${depart}:${seats}`;
}

export function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

export function getCachedResult(cacheKey: string): any | null {
  const entry = liveSearchCache.get(cacheKey);
  if (entry && isCacheValid(entry)) return entry.data;
  if (entry && !isCacheValid(entry)) liveSearchCache.delete(cacheKey);
  return null;
}

export function cacheResult(cacheKey: string, data: any): void {
  const entry: CacheEntry = { data, timestamp: Date.now(), ttl: CACHE_TTL };
  liveSearchCache.set(cacheKey, entry);
}

// Time and date helpers
export function parseLocalTime(iso: string): Date {
  return new Date(iso.replace(/Z$/, ''));
}

export function formatTime(iso: string): string {
  const date = parseLocalTime(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getDayDiff(baseDate: string, compareIso: string): number {
  const base = new Date(baseDate + 'T00:00:00Z');
  const compare = new Date(compareIso);
  return Math.floor((compare.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export const getAirlineCode = (flightNumber: string): string => flightNumber.slice(0, 2).toUpperCase();

export function formatLayoverDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function getLocalDayDiff(baseDate: string, iso: string): number {
  const base = new Date(baseDate);
  const compare = parseLocalTime(iso);
  const baseYMD = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
  const compareYMD = `${compare.getFullYear()}-${String(compare.getMonth() + 1).padStart(2, '0')}-${String(compare.getDate()).padStart(2, '0')}`;
  const baseDateObj = new Date(baseYMD);
  const compareDateObj = new Date(compareYMD);
  return Math.floor((compareDateObj.getTime() - baseDateObj.getTime()) / (1000 * 60 * 60 * 24));
}

export function getFlightLocalDate(iso: string): string {
  return formatYMD(parseLocalTime(iso));
}

export function formatYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseLocalDateFromIso(iso: string): string {
  const d = new Date(iso.replace(/Z$/, ''));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDayDiffFromItinerary(itineraryDate: string, iso: string): number {
  const itinerary = new Date(itineraryDate);
  const flightDate = new Date(parseLocalDateFromIso(iso));
  return Math.floor((flightDate.getTime() - itinerary.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatIsoTime(iso: string): string {
  const [, time] = iso.split('T');
  return time ? time.slice(0, 5) : '';
}

// Alliance/grouping helpers
const ALLIANCE: Record<string, string[]> = {
  OW: ['AS', 'AA', 'BA', 'CX', 'FJ', 'AY', 'IB', 'JL', 'QF', 'QR', 'AT', 'RJ', 'UL', 'WY', 'MH'],
  SA: ['A3', 'AC', 'CA', 'AI', 'NZ', 'NH', 'NQ', 'EQ', 'OZ', 'OS', 'AV', 'SN', 'CM', 'OU', 'MS', 'ET', 'BR', 'LO', 'LH', 'CL', 'SQ', 'SA', 'LX', 'TP', 'TG', 'UA', 'TK'],
  ST: ['AR', 'AM', 'UX', 'AF', 'CI', 'MU', 'DL', 'GA', 'KQ', 'KL', 'KE', 'ME', 'SV', 'SK', 'RO', 'VN', 'VS', 'MF'],
  EY: ['EY'],
  EK: ['EK'],
  JX: ['JX'],
  B6: ['B6'],
  DE: ['DE'],
  GF: ['GF'],
};

export function getAllianceForAirline(code: string): string | null {
  for (const [alliance, airlines] of Object.entries(ALLIANCE)) {
    if (airlines.includes(code)) return alliance;
  }
  return null;
}

export type AllianceLineGroup = { start: number; end: number; alliance: string | null; isUnreliable: boolean };

export function buildAllianceLineGroups(
  flights: Array<{ FlightNumbers: string; YCount: number; WCount: number; JCount: number; FCount: number }>,
  reliabilityMap: Record<string, { min_count: number; exemption?: string }>
): AllianceLineGroup[] {
  const unreliableSegments = new Set<number>();
  flights.forEach((f, i) => {
    const code = getAirlineCode(f.FlightNumbers);
    const rel = reliabilityMap[code];
    const min = rel?.min_count ?? 1;
    const exemption = rel?.exemption || '';
    const classCounts = [
      { cls: 'Y', count: f.YCount },
      { cls: 'W', count: f.WCount },
      { cls: 'J', count: f.JCount },
      { cls: 'F', count: f.FCount },
    ];
    const isUnreliable = !classCounts.some(({ cls, count }) => {
      const minCount = exemption.includes(cls) ? 1 : min;
      return count >= minCount;
    });
    if (isUnreliable) unreliableSegments.add(i);
  });

  const lineGroups: AllianceLineGroup[] = [];
  let currentGroup: AllianceLineGroup | null = null;
  for (let index = 0; index < flights.length; index++) {
    const isUnreliable = unreliableSegments.has(index);
    const airlineCode = getAirlineCode(flights[index].FlightNumbers);
    const alliance = isUnreliable ? null : getAllianceForAirline(airlineCode);

    if (currentGroup === null) {
      currentGroup = { start: index, end: index, alliance, isUnreliable };
    } else if (currentGroup.isUnreliable !== isUnreliable || (currentGroup.isUnreliable === false && currentGroup.alliance !== alliance)) {
      lineGroups.push(currentGroup);
      currentGroup = { start: index, end: index, alliance, isUnreliable };
    } else {
      currentGroup.end = index;
    }
  }
  if (currentGroup) lineGroups.push(currentGroup);
  return lineGroups;
}


