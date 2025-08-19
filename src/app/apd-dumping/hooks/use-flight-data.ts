import { useState } from 'react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { APDFlight } from '../types';

export function useFlightData() {
  const [flights, setFlights] = useState<APDFlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlights = async (date: DateRange | undefined, seatsFilter: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = `https://api.bbairtools.com/api/seats-aero-alaska`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: date?.from ? format(date.from, 'yyyy-MM-dd') : undefined,
          endDate: date?.to ? format(date.to, 'yyyy-MM-dd') : undefined,
          seats: parseInt(seatsFilter)
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setFlights(data.trips || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch flights');
    } finally {
      setLoading(false);
    }
  };

  return {
    flights,
    loading,
    error,
    fetchFlights
  };
}