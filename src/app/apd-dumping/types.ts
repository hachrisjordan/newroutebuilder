export interface APDFlight {
  TotalTaxes: number;
  Duration: number;
  OriginAirport: string;
  DestinationAirport: string;
  Aircraft: string[];
  FlightNumbers: string;
  DepartsAt: string;
  ArrivesAt: string;
  UpdatedAt: string;
  Distance: number;
  economy: boolean;
  business: boolean;
  economySeats: number;
  economyMiles: number;
  businessSeats?: number;
  businessMiles?: number;
}

export interface KoreanAirFlight {
  OriginAirport: string;
  DestinationAirport: string;
  Aircraft: string[];
  FlightNumbers: string;
  DepartsAt: string;
  ArrivesAt: string;
  UpdatedAt: string;
  Distance: number;
  premiumSeats?: number;
  premiumMiles?: number;
  premiumTax?: number;
  businessSeats?: number;
  businessMiles?: number;
  businessTax?: number;
  firstSeats?: number;
  firstMiles?: number;
  firstTax?: number;
}

export interface BundleClass {
  FClass?: string;
  JClass?: string;
  WClass?: string;
  YClass?: string;
}

export interface FlightSegment {
  from: string;
  to: string;
  aircraft: string;
  stops: number;
  depart: string;
  arrive: string;
  flightnumber: string;
  duration: number;
  layover: number;
  distance: number;
  bundleClasses: BundleClass[];
}

export interface Bundle {
  class: string;
  points: string;
  fareTax: string;
}

export interface Itinerary {
  from: string;
  to: string;
  connections: string[];
  depart: string;
  arrive: string;
  duration: number;
  bundles: Bundle[];
  segments: FlightSegment[];
}

export interface LiveSearchResponse {
  itinerary?: Itinerary[];
}

export interface VerifiedPricing {
  miles: number;
  tax: number;
  isValid: boolean;
  errorMessage?: string;
}