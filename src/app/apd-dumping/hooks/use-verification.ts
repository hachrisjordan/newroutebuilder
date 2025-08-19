import { useState } from 'react';
import type { APDFlight, KoreanAirFlight, VerifiedPricing } from '../types';
import { parseFlightFromIdentifier, parseKoreanAirFromIdentifier } from '../utils';

export function useVerification() {
  const [verifyingAvailability, setVerifyingAvailability] = useState(false);
  const [verifiedPricing, setVerifiedPricing] = useState<VerifiedPricing | null>(null);

  const verifyAvailabilityAndPricing = async (
    selectedFlight: string | null,
    selectedKoreanAirClass: string | null,
    flights: APDFlight[],
    paginatedKoreanAirFlights: KoreanAirFlight[]
  ) => {
    if (!selectedFlight || !selectedKoreanAirClass) return;
    
    try {
      setVerifyingAvailability(true);
      
      // Parse the unique identifier to find the exact APD flight
      const { flightNumber, destinationAirport, originAirport, departsAt } = parseFlightFromIdentifier(selectedFlight);
      
      const selectedAPDFlight = flights.find(flight => 
        flight.FlightNumbers === flightNumber &&
        flight.DepartsAt === departsAt &&
        flight.OriginAirport === originAirport &&
        flight.DestinationAirport === destinationAirport
      );
      
      const { flightIndex, className } = parseKoreanAirFromIdentifier(selectedKoreanAirClass);
      const selectedBAFlight = paginatedKoreanAirFlights[flightIndex];
      
      if (!selectedAPDFlight || !selectedBAFlight) {
        setVerifiedPricing({
          miles: 0,
          tax: 0,
          isValid: false,
          errorMessage: 'Selected flight not found'
        });
        return;
      }
      
      // Determine which class was selected and get the corresponding data
      let selectedMiles = 0;
      let selectedTax = 0;
      
      switch (className) {
        case 'premium':
          selectedMiles = selectedBAFlight.premiumMiles || 0;
          selectedTax = selectedBAFlight.premiumTax || 0;
          break;
        case 'business':
          selectedMiles = selectedBAFlight.businessMiles || 0;
          selectedTax = selectedBAFlight.businessTax || 0;
          break;
        case 'first':
          selectedMiles = selectedBAFlight.firstMiles || 0;
          selectedTax = selectedBAFlight.firstTax || 0;
          break;
        default:
          setVerifiedPricing({
            miles: 0,
            tax: 0,
            isValid: false,
            errorMessage: 'Invalid class selected'
          });
          return;
      }
      
      // Verify the pricing matches
      const isValid = selectedMiles === selectedAPDFlight.businessMiles && selectedTax === selectedAPDFlight.TotalTaxes;
      
      setVerifiedPricing({
        miles: selectedMiles,
        tax: selectedTax,
        isValid,
        errorMessage: isValid ? undefined : 'Pricing mismatch detected'
      });
      
    } catch (error) {
      setVerifiedPricing({
        miles: 0,
        tax: 0,
        isValid: false,
        errorMessage: 'Verification failed'
      });
    } finally {
      setVerifyingAvailability(false);
    }
  };

  return {
    verifyingAvailability,
    verifiedPricing,
    verifyAvailabilityAndPricing
  };
}