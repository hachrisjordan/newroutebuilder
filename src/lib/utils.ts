import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
