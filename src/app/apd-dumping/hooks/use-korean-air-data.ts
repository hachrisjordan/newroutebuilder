import { useState } from 'react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { KoreanAirFlight } from '../types';

export function useKoreanAirData() {
  const [koreanAirFlights, setKoreanAirFlights] = useState<KoreanAirFlight[]>([]);
  const [koreanAirLoading, setKoreanAirLoading] = useState(false);
  const [koreanAirCurrentPage, setKoreanAirCurrentPage] = useState(1);
  const [koreanAirError, setKoreanAirError] = useState<string | null>(null);

  const KOREAN_AIR_PAGE_SIZE = 10;

  const fetchKoreanAirFlights = async (date: DateRange | undefined, seatsFilter: string) => {
    try {
      setKoreanAirLoading(true);
      setKoreanAirError(null);
      
      const apiUrl = `https://api.bbairtools.com/api/seats-aero-korean-air`;
      
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
      setKoreanAirFlights(data.trips || []);
      setKoreanAirCurrentPage(1);
    } catch (err: any) {
      setKoreanAirError(err.message || 'Failed to fetch Korean Air flights');
    } finally {
      setKoreanAirLoading(false);
    }
  };

  const getPaginatedKoreanAirFlights = () => {
    const startIndex = (koreanAirCurrentPage - 1) * KOREAN_AIR_PAGE_SIZE;
    const endIndex = startIndex + KOREAN_AIR_PAGE_SIZE;
    return koreanAirFlights.slice(startIndex, endIndex);
  };

  const totalKoreanAirPages = Math.ceil(koreanAirFlights.length / KOREAN_AIR_PAGE_SIZE);

  return {
    koreanAirFlights,
    koreanAirLoading,
    koreanAirError,
    koreanAirCurrentPage,
    setKoreanAirCurrentPage,
    fetchKoreanAirFlights,
    getPaginatedKoreanAirFlights,
    totalKoreanAirPages,
    KOREAN_AIR_PAGE_SIZE
  };
}