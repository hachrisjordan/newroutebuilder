import { format } from 'date-fns';
import type { APDFlight, KoreanAirFlight } from './types';

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'MMM d, yyyy');
};

export const formatTime = (dateString: string) => {
  return format(new Date(dateString), 'HH:mm');
};

export const getFlightIdentifier = (flight: APDFlight) => {
  return `${flight.FlightNumbers}-${flight.DepartsAt}-${flight.OriginAirport}-${flight.DestinationAirport}`;
};

export const getKoreanAirIdentifier = (flight: KoreanAirFlight, index: number, className: string) => {
  return `${index}-${className}`;
};

export const parseFlightFromIdentifier = (identifier: string) => {
  const parts = identifier.split('-');
  const flightNumber = parts[0];
  const destinationAirport = parts[parts.length - 1];
  const originAirport = parts[parts.length - 2];
  const departsAt = parts.slice(1, -2).join('-');
  
  return {
    flightNumber,
    destinationAirport,
    originAirport,
    departsAt
  };
};

export const parseKoreanAirFromIdentifier = (identifier: string) => {
  const [flightIndex, className] = identifier.split('-');
  return {
    flightIndex: parseInt(flightIndex),
    className
  };
};