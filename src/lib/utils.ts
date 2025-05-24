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
