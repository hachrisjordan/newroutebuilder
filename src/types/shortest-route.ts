// Types for Shortest Route game
import { z } from 'zod';

export type Alliance = 'ST' | 'SA' | 'OW';

export interface ShortestRouteChallenge {
  id: string;
  origin: string; // IATA
  destination: string; // IATA
  alliance: Alliance;
  stopCount: 1 | 2;
  shortestRoute: string[]; // [origin, hub1, destination] or [origin, hub1, hub2, destination]
  shortestRoutes: string[][]; // all shortest hub sequences (hubs only)
  shortestDistance: number;
  tries: number;
  mode: 'daily' | 'practice';
}

export interface ShortestRouteGuess {
  hubs: string[]; // [hub1] or [hub1, hub2]
  isValid: boolean;
  totalDistance?: number;
  differenceFromShortest?: number;
  error?: string;
}

export const ShortestRouteGuessSchema = z.object({
  hubs: z.array(z.string().length(3)).min(1).max(2),
});

export interface PathRow {
  origin: string;
  destination: string;
  hub1?: string;
  hub2?: string;
  alliance: Alliance;
  totaldistance: number;
} 