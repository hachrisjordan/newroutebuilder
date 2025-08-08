import { useState, useEffect } from 'react';
import { message } from 'antd';
import { getSeatConfigUrl } from '../config/cloud';
import { SeatData } from '../types/seat-viewer';

export const useSeatData = (selectedAirline: string | null) => {
  const [seatData, setSeatData] = useState<SeatData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedAirline) {
      const fetchSeatData = async () => {
        setLoading(true);
        try {
          // Fetch from URL for all airlines including AF
          const response = await fetch(getSeatConfigUrl(selectedAirline));
          if (!response.ok) {
            throw new Error(`Failed to fetch seat data for ${selectedAirline}`);
          }
          const data = await response.json();
          setSeatData(data);
        } catch (error) {
          console.error('Error fetching seat data:', error);
          message.error(`No seat configuration data available for ${selectedAirline}`);
          setSeatData(null);
        } finally {
          setLoading(false);
        }
      };
      
      fetchSeatData();
    } else {
      setSeatData(null);
    }
  }, [selectedAirline]);

  return { seatData, loading };
};