import { useState } from 'react';
import { API_BASE_URL } from '../config/cloud';
import { RegistrationDataItem } from '../types/seat-viewer';

export const useFlightData = () => {
  const [registrationData, setRegistrationData] = useState<RegistrationDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);

  const fetchFlightData = async (
    selectedAirline: string,
    flightNumber: string,
    origin?: string | null,
    arrival?: string | null
  ) => {
    if (!selectedAirline || !flightNumber) {
      return;
    }

    // Clear previous data when starting a new search
    setRegistrationData([]);
    setDataFetched(false);
    setLoading(true);

    try {
      // Build API URL with optional origin/destination
      let apiUrl = `${API_BASE_URL}/api/flightradar24/${selectedAirline}${flightNumber}`;
      const params = [];
      if (origin) params.push(`origin=${encodeURIComponent(origin)}`);
      if (arrival) params.push(`destination=${encodeURIComponent(arrival)}`);
      if (params.length > 0) {
        apiUrl += `?${params.join('&')}`;
      }

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const data = await response.json();
      console.log('Flight data response:', data);
      setRegistrationData(data);
      setDataFetched(true);
    } catch (error) {
      console.error('Error fetching flight data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearData = () => {
    setRegistrationData([]);
    setDataFetched(false);
  };

  return {
    registrationData,
    loading,
    dataFetched,
    fetchFlightData,
    clearData
  };
};