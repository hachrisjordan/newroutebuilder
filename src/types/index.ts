// Re-export specific types to avoid conflicts
export type { 
  AircraftConfig as AdminAircraftConfig, 
  TailNumber, 
  AircraftType, 
  AdminUser 
} from './admin';
export type { 
  AwardFinderResults, 
  Flight, 
  FlightId, 
  Itinerary, 
  AwardFinderSearchParams,
  AwardFinderSearchRequest
} from './award-finder-results';
export type { 
  FilterMetadata, 
  FilterMetadataResponse, 
  AirportMeta, 
  AirlineMeta, 
  AirportFilterState 
} from './filter-metadata';
export type { 
  Airport, 
  Path, 
  IntraRoute, 
  FullRoutePathResult 
} from './route';
export type { 
  RegistrationDataItem,
  AircraftDetails,
  OnTimeStatus,
  VariantConfig,
  AircraftConfig as SeatViewerAircraftConfig
} from './seat-viewer';
export type { 
  Alliance,
  ShortestRouteChallenge,
  ShortestRouteGuess,
  PathRow
} from './shortest-route';

// Seats.aero OAuth types
export type {
  SeatsAeroOAuthConfig,
  SeatsAeroConsentParams,
  SeatsAeroTokenRequest,
  SeatsAeroTokenResponse,
  SeatsAeroUserInfo,
  SeatsAeroOAuthState,
  SeatsAeroStoredTokens,
  SeatsAeroOAuthError
} from './seatsaero-oauth';

// PZ (United specific data) types
export interface PZSearchParams {
  departureAirports: string[];
  arrivalAirports: string[];
  date: { from?: Date; to?: Date };
  fareClass: 'IN' | 'XN' | 'PZ' | 'PN' | 'ZN' | 'RN';
}

export interface PZRecord {
  departure_date: string;
  flight_number: string;
  origin_airport: string | null;
  destination_airport: string | null;
  pz: string | null;
  pn: string | null;
  in: string | null;
  rn: string | null;
  xn: string | null;
  zn: string | null;
  id: string;
}

export interface PZFlightStats {
  route: string; // "Origin-Destination" format
  flight_count: number;
  average_pz: number | null;
  median_pz: number | null;
  pz_flight_count: number; // flights data
  pz_percentage: number; // percentage of flights data
}

export interface PZDayStats {
  route: string;
  date: string;
  flight_count: number;
  total_pz: number | null;
  average_pz: number | null;
  median_pz: number | null;
  pz_flight_count: number;
  has_pz: boolean;
}

export interface PZRouteAnalysis {
  route: string;
  total_flights: number;
  total_days: number;
  days_with_pz: number;
  flights_with_pz: number;
  average_pz_per_flight: number | null;
  median_pz_per_flight: number | null;
  average_pz_per_day: number | null;
  median_pz_per_day: number | null;
  percentage_flights_with_pz: number;
  percentage_days_with_pz: number;
}

export interface PZAnalysisResults {
  routes: PZRouteAnalysis[];
  summary: {
    total_routes: number;
    total_flights: number;
    total_days: number;
    overall_flight_pz_percentage: number;
    overall_day_pz_percentage: number;
  };
}
