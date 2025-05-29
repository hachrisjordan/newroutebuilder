// Types for Award Finder Results

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
} 