import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Flight } from '@/types/award-finder-results';
import { z } from 'zod';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Custom deep strict equality check that works in the browser and properly distinguishes
 * between arrays and objects. Fixes bugs with array vs object comparison, type distinction,
 * and circular reference handling.
 * @param a First value to compare
 * @param b Second value to compare
 * @returns true if values are deeply equal, false otherwise
 */
export function isDeepStrictEqual(a: any, b: any): boolean {
  return _isDeepStrictEqualWithCache(a, b, new WeakMap());
}

/**
 * Internal implementation with circular reference tracking
 */
function _isDeepStrictEqualWithCache(a: any, b: any, visited: WeakMap<object, WeakSet<object>>): boolean {
  // Same reference check
  if (a === b) return true;
  
  // Null/undefined checks
  if (a == null || b == null) return a === b;
  
  // Type checks
  if (typeof a !== typeof b) return false;
  
  // Primitive types (already handled by === above, but keeping for clarity)
  if (typeof a !== 'object') return a === b;
  
  // Circular reference detection
  if (typeof a === 'object' && typeof b === 'object') {
    if (!visited.has(a)) {
      visited.set(a, new WeakSet());
    }
    if (visited.get(a)!.has(b)) {
      return true; // Circular reference detected, assume equal
    }
    visited.get(a)!.add(b);
  }
  
  // Array vs Object distinction
  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) return false;
  
  // Constructor/Type distinction for objects
  if (!aIsArray && a.constructor !== b.constructor) return false;
  
  // Handle specific object types
  
  // Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  
  // RegExp objects
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }
  
  // Error objects
  if (a instanceof Error && b instanceof Error) {
    return a.name === b.name && a.message === b.message && a.stack === b.stack;
  }
  
  // Map objects
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key) || !_isDeepStrictEqualWithCache(value, b.get(key), visited)) {
        return false;
      }
    }
    return true;
  }
  
  // Set objects
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const value of a) {
      let found = false;
      for (const bValue of b) {
        if (_isDeepStrictEqualWithCache(value, bValue, visited)) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }
  
  // ArrayBuffer objects
  if (a instanceof ArrayBuffer && b instanceof ArrayBuffer) {
    if (a.byteLength !== b.byteLength) return false;
    const aView = new Uint8Array(a);
    const bView = new Uint8Array(b);
    for (let i = 0; i < aView.length; i++) {
      if (aView[i] !== bView[i]) return false;
    }
    return true;
  }
  
  // TypedArray objects (Uint8Array, Int32Array, etc.)
  if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
    if (a.constructor !== b.constructor) return false;
    if (a.byteLength !== b.byteLength) return false;
    const aArray = a as any;
    const bArray = b as any;
    if (aArray.length !== bArray.length) return false;
    for (let i = 0; i < aArray.length; i++) {
      if (aArray[i] !== bArray[i]) return false;
    }
    return true;
  }
  
  // Function objects - only equal if same reference (already handled above)
  if (typeof a === 'function' && typeof b === 'function') {
    return false; // Functions are only equal if they're the same reference
  }
  
  // Plain objects and arrays - compare properties
  const keys1 = Object.keys(a);
  const keys2 = Object.keys(b);
  
  // Length comparison
  if (keys1.length !== keys2.length) return false;
  
  // Recursively check each property
  for (const key of keys1) {
    if (!(key in b)) return false;
    if (!_isDeepStrictEqualWithCache(a[key], b[key], visited)) return false;
  }
  
  return true;
}

/**
 * Formats ontime status for diverted flights.
 * @param ontime - The original ontime string (e.g., "Diverted to LGW")
 * @returns Formatted string (e.g., "Diverted (LGW)")
 */
export function formatDivertedOntime(ontime: string): string {
  if (ontime.startsWith('Diverted to')) {
    const code = ontime.replace('Diverted to', '').trim();
    return `Diverted (${code})`;
  }
  return ontime;
}

/**
 * Returns the correct airline logo path, using the -white variant for certain airlines in dark mode.
 * @param code Airline IATA code (e.g., 'LH')
 * @param isDarkMode Whether dark mode is active (SSR) or undefined for client-side detection
 */
const AIRLINES_DARK_LOGO = ['LH', 'AM', 'NZ','LO'];

export function getAirlineLogoSrc(code: string, isDarkMode?: boolean): string {
  if (!code) return '';
  const upperCode = code.toUpperCase();
  if (AIRLINES_DARK_LOGO.includes(upperCode) && isDarkMode) {
    // Prefer PNG, fallback to JPG for AM
    if (upperCode === 'AM') {
      return `/AM-white.jpg`;
    }
    return `/${upperCode}-white.png`;
  }
  return `/${upperCode}.png`;
}

/**
 * React hook to get the correct airline logo path for client components, using theme detection.
 * @param code Airline IATA code
 */
import { useTheme } from 'next-themes';
import { useMemo } from 'react';

export function useAirlineLogoSrc(code: string): string {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return useMemo(() => getAirlineLogoSrc(code, isDark), [code, isDark]);
}

/**
 * Returns the total duration of an itinerary, including layovers.
 * @param flights Array of Flight objects in the itinerary order (may include undefined)
 */
export function getTotalDuration(flights: (Flight | undefined)[]): number {
  let total = 0;
  for (let i = 0; i < flights.length; i++) {
    const flight = flights[i];
    if (!flight) continue; // skip undefined
    total += flight.TotalDuration;
    if (i > 0 && flights[i - 1]) {
      const prevArrive = new Date(flights[i - 1]!.ArrivesAt).getTime();
      const currDepart = new Date(flight.DepartsAt).getTime();
      const layover = Math.max(0, Math.round((currDepart - prevArrive) / (1000 * 60)));
      total += layover;
    }
  }
  return total;
}

/**
 * Returns the percentage of the itinerary spent in each class (Y, W, J, F),
 * applying the reliability rule: for each segment, if its duration is > 15% of total flight duration
 * and the class count < minCount (showing triangle), treat that class as 0 for that segment.
 * @param flights Array of Flight objects in the itinerary order
 * @param reliability Record<string, { min_count: number; exemption?: string }>
 * @param minReliabilityPercent number (0-100) - not used in this implementation
 */
export function getClassPercentages(
  flights: Flight[],
  reliability?: Record<string, { min_count: number; exemption?: string }>,
  minReliabilityPercent: number = 100
) {
  // Calculate total flight duration (excluding layover time)
  const totalFlightDuration = flights.reduce((sum, f) => sum + f.TotalDuration, 0);
  
  if (!reliability) {
    // fallback to original logic if no reliability data
    // Y: 100% if all flights have YCount > 0, else 0%
    const y = flights.every(f => f.YCount > 0) ? 100 : 0;

    // W: percentage of total flight duration where WCount > 0
    let w = 0;
    if (flights.some(f => f.WCount > 0)) {
      const wDuration = flights.filter(f => f.WCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
      w = Math.round((wDuration / totalFlightDuration) * 100);
    }

    // J: percentage of total flight duration where JCount > 0
    let j = 0;
    if (flights.some(f => f.JCount > 0)) {
      const jDuration = flights.filter(f => f.JCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
      j = Math.round((jDuration / totalFlightDuration) * 100);
    }

    // F: percentage of total flight duration where FCount > 0
    let f = 0;
    if (flights.some(f => f.FCount > 0)) {
      const fDuration = flights.filter(f => f.FCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
      f = Math.round((fDuration / totalFlightDuration) * 100);
    }
    return { y, w, j, f };
  }

  // Apply the reliability rule: if segment > 15% of total flight time AND class shows triangle, count = 0
  const threshold = 0.15 * totalFlightDuration; // 15% of total flight duration
  
  // For each segment, adjust counts for each class as per the rule
  const adjusted = flights.map(f => {
    const code = f.FlightNumbers.slice(0, 2);
    const rel = reliability[code];
    const min = rel?.min_count ?? 1;
    const exemption = rel?.exemption || '';
    
    // Determine minimum counts for each class
    const minY = exemption.includes('Y') ? 1 : min;
    const minW = exemption.includes('W') ? 1 : min;
    const minJ = exemption.includes('J') ? 1 : min;
    const minF = exemption.includes('F') ? 1 : min;
    
    // Check if this segment is > 15% of total flight duration
    const overThreshold = f.TotalDuration > threshold;
    
    return {
      YCount: overThreshold && f.YCount < minY ? 0 : f.YCount,
      WCount: overThreshold && f.WCount < minW ? 0 : f.WCount,
      JCount: overThreshold && f.JCount < minJ ? 0 : f.JCount,
      FCount: overThreshold && f.FCount < minF ? 0 : f.FCount,
      TotalDuration: f.TotalDuration,
    };
  });

  // Now calculate percentages using the adjusted data
  const y = adjusted.every(f => f.YCount > 0) ? 100 : 0;
  
  let w = 0;
  if (adjusted.some(f => f.WCount > 0)) {
    const wDuration = adjusted.filter(f => f.WCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
    w = Math.round((wDuration / totalFlightDuration) * 100);
  }
  
  let j = 0;
  if (adjusted.some(f => f.JCount > 0)) {
    const jDuration = adjusted.filter(f => f.JCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
    j = Math.round((jDuration / totalFlightDuration) * 100);
  }
  
  let f = 0;
  if (adjusted.some(flt => flt.FCount > 0)) {
    const fDuration = adjusted.filter(flt => flt.FCount > 0).reduce((sum, flt) => sum + flt.TotalDuration, 0);
    f = Math.round((fDuration / totalFlightDuration) * 100);
  }
  
  return { y, w, j, f };
}

export const awardFinderSearchParamsSchema = z.object({
  origin: z.string().min(3).max(255),
  destination: z.string().min(3).max(255),
  maxStop: z.number().int().min(0).max(4),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const awardFinderSearchRequestSchema = awardFinderSearchParamsSchema.extend({
  apiKey: z.string().min(1),
});

/**
 * Searches airports using the dynamic API endpoint
 * @param search - Search query string
 * @param page - Page number (default: 1)
 * @param pageSize - Items per page (default: 20)
 */
export async function searchAirports(search: string = '', page: number = 1, pageSize: number = 20) {
  try {
    const params = new URLSearchParams({
      search: search.trim(),
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    
    const response = await fetch(`/api/airports?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch airports: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      airports: data.airports || [],
      total: data.total || 0,
      page: data.page || 1,
      pageSize: data.pageSize || pageSize,
    };
  } catch (error) {
    console.error('Error searching airports:', error);
    throw error;
  }
}
