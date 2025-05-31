import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Flight } from '@/types/award-finder-results';
import { z } from 'zod';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
 * @param flights Array of Flight objects in the itinerary order
 */
export function getTotalDuration(flights: Flight[]): number {
  let total = 0;
  for (let i = 0; i < flights.length; i++) {
    total += flights[i].TotalDuration;
    if (i > 0) {
      const prevArrive = new Date(flights[i - 1].ArrivesAt).getTime();
      const currDepart = new Date(flights[i].DepartsAt).getTime();
      const layover = Math.max(0, Math.round((currDepart - prevArrive) / (1000 * 60)));
      total += layover;
    }
  }
  return total;
}

/**
 * Returns the percentage of the itinerary spent in each class (Y, W, J, F),
 * applying the minReliabilityPercent rule: for each segment, if its duration is > (100 - minReliabilityPercent)% of total duration
 * and the class count < minCount, treat that class as 0 for that segment.
 * @param flights Array of Flight objects in the itinerary order
 * @param reliability Record<string, { min_count: number }>
 * @param minReliabilityPercent number (0-100)
 */
export function getClassPercentages(
  flights: Flight[],
  reliability?: Record<string, { min_count: number }>,
  minReliabilityPercent: number = 100
) {
  const totalDuration = flights.reduce((sum, f) => sum + f.TotalDuration, 0);
  if (!reliability || minReliabilityPercent === 100) {
    // fallback to original logic if no reliability or 100%
    // Y: 100% if all flights have YCount > 0, else 0%
    const y = flights.every(f => f.YCount > 0) ? 100 : 0;

    // W: percentage of total duration where WCount > 0
    let w = 0;
    if (flights.some(f => f.WCount > 0)) {
      const wDuration = flights.filter(f => f.WCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
      w = Math.round((wDuration / totalDuration) * 100);
    }

    // J: percentage of total duration where JCount > 0
    let j = 0;
    if (flights.some(f => f.JCount > 0)) {
      const jDuration = flights.filter(f => f.JCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
      j = Math.round((jDuration / totalDuration) * 100);
    }

    // F: percentage of total duration where FCount > 0
    let f = 0;
    if (flights.some(f => f.FCount > 0)) {
      const fDuration = flights.filter(f => f.FCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
      f = Math.round((fDuration / totalDuration) * 100);
    }
    return { y, w, j, f };
  }
  // Apply the combined rule
  const threshold = (100 - minReliabilityPercent) / 100 * totalDuration;
  // For each segment, adjust counts for each class as per the rule
  const adjusted = flights.map(f => {
    const code = f.FlightNumbers.slice(0, 2);
    const min = reliability[code]?.min_count ?? 1;
    const overThreshold = f.TotalDuration > threshold;
    return {
      YCount: overThreshold && f.YCount < min ? 0 : f.YCount,
      WCount: overThreshold && f.WCount < min ? 0 : f.WCount,
      JCount: overThreshold && f.JCount < min ? 0 : f.JCount,
      FCount: overThreshold && f.FCount < min ? 0 : f.FCount,
      TotalDuration: f.TotalDuration,
    };
  });
  // Now apply the current rule to the adjusted data
  const y = adjusted.every(f => f.YCount > 0) ? 100 : 0;
  let w = 0;
  if (adjusted.some(f => f.WCount > 0)) {
    const wDuration = adjusted.filter(f => f.WCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
    w = Math.round((wDuration / totalDuration) * 100);
  }
  let j = 0;
  if (adjusted.some(f => f.JCount > 0)) {
    const jDuration = adjusted.filter(f => f.JCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
    j = Math.round((jDuration / totalDuration) * 100);
  }
  let f = 0;
  if (adjusted.some(flt => flt.FCount > 0)) {
    const fDuration = adjusted.filter(flt => flt.FCount > 0).reduce((sum, flt) => sum + flt.TotalDuration, 0);
    f = Math.round((fDuration / totalDuration) * 100);
  }
  return { y, w, j, f };
}

export const awardFinderSearchParamsSchema = z.object({
  origin: z.string().min(3).max(3),
  destination: z.string().min(3).max(3),
  maxStop: z.number().int().min(0).max(4),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const awardFinderSearchRequestSchema = awardFinderSearchParamsSchema.extend({
  apiKey: z.string().min(1),
});
