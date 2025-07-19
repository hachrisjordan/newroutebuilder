'use client';

import { SeatTypeDelaySearch } from '@/components/seat-type-delay-search';
import { useState, useEffect } from 'react';
import { FlightCalendar } from '@/components/flight-calendar';
import dynamic from 'next/dynamic';

const VariantAnalysis = dynamic(() => import('@/components/variant-analysis'), { ssr: false });
const DelayAnalysis = dynamic(() => import('@/components/delay-analysis'), { ssr: false });

// Simple hook to detect mobile (<1000px)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1000);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function SeatTypeDelayPage() {
  const [flightData, setFlightData] = useState<any[]>([]);
  const [airline, setAirline] = useState<string | undefined>(undefined);
  const [seatConfigData, setSeatConfigData] = useState<any | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const isMobile = useIsMobile();

  // Handle search and extract airline code
  const handleSearch = (params: {
    airline: string | undefined;
    flightNumber: string;
    originAirport: string | undefined;
    arrivalAirport: string | undefined;
    flightData?: any;
  }) => {
    if (params.flightData) {
      setFlightData(params.flightData);
      setAirline(params.airline);
    }
  };

  // Fetch seat config when airline changes
  useEffect(() => {
    if (!airline) {
      setSeatConfigData(null);
      return;
    }
    setConfigLoading(true);
    fetch(`/api/aircraft-config/${airline}`)
      .then(res => res.json())
      .then(data => setSeatConfigData(data))
      .catch(() => setSeatConfigData(null))
      .finally(() => setConfigLoading(false));
  }, [airline]);

  return (
    <div className="w-full flex-1 flex flex-col items-center pt-8 px-4">
      <div className="flex flex-col gap-6 items-center w-full mb-8">
        <SeatTypeDelaySearch onSearch={handleSearch} />
        {flightData.length > 0 && (
          isMobile ? (
            // On mobile, render each card separately
            <>
              <div className="w-full max-w-[370px] mx-auto">
                <FlightCalendar flightData={flightData} />
              </div>
              {seatConfigData && !configLoading && (
                <div className="w-full">
                  <VariantAnalysis
                    flightData={flightData}
                    seatConfigData={seatConfigData}
                    airline={airline || ''}
                  />
                  <DelayAnalysis flightData={flightData} />
                </div>
              )}
            </>
          ) : (
            // On desktop/tablet, use shared container for perfect alignment
            <div className="w-full xxl:w-4/5 mx-auto flex flex-col gap-4">
              <FlightCalendar flightData={flightData} />
              {seatConfigData && !configLoading && (
                <>
                  <VariantAnalysis
                    flightData={flightData}
                    seatConfigData={seatConfigData}
                    airline={airline || ''}
                  />
                  <DelayAnalysis flightData={flightData} />
                </>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
} 