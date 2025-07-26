// Types for Award Finder Results
import type { FilterMetadata } from './filter-metadata';

export interface Flight {
  FlightNumbers: string;
  TotalDuration: number;
  Aircraft: string;
  DepartsAt: string;
  ArrivesAt: string;
  YCount: number;
  WCount: number;
  JCount: number;
  FCount: number;
}

export type FlightId = string;

export type Itinerary = FlightId[];

export interface AwardFinderResults {
  itineraries: {
    [route: string]: {
      [date: string]: Itinerary[];
    };
  };
  flights: {
    [flightId: string]: Flight;
  };
  minRateLimitRemaining?: number;
  minRateLimitReset?: number;
  totalSeatsAeroHttpRequests?: number;
  filterMetadata?: FilterMetadata;
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface AwardFinderSearchParams {
  origin: string;
  destination: string;
  maxStop: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface AwardFinderSearchRequest extends AwardFinderSearchParams {
  apiKey: string;
} 