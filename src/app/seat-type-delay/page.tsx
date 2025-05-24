'use client';

import { SeatTypeDelaySearch } from '@/components/seat-type-delay-search';
import { useState, useEffect } from 'react';
import { FlightCalendar } from '@/components/flight-calendar';
import dynamic from 'next/dynamic';

const VariantAnalysis = dynamic(() => import('@/components/variant-analysis'), { ssr: false });

export default function SeatTypeDelayPage() {
  const [flightData, setFlightData] = useState<any[]>([]);
  const [airline, setAirline] = useState<string | undefined>(undefined);
  const [seatConfigData, setSeatConfigData] = useState<any | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

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
    fetch(`https://rbbackend-fzkmdxllwa-uc.a.run.app/api/aircraft-config/${airline}`)
      .then(res => res.json())
      .then(data => setSeatConfigData(data))
      .catch(() => setSeatConfigData(null))
      .finally(() => setConfigLoading(false));
  }, [airline]);

  return (
    <div className="w-full min-h-screen flex flex-col items-center pt-8 px-4">
      <div className="flex flex-col gap-6 items-center w-full mb-8">
        <SeatTypeDelaySearch onSearch={handleSearch} />
        {flightData.length > 0 && (
          // Shared container for perfect alignment and mobile max width
          <div className="w-full xxl:w-4/5 mx-auto flex flex-col gap-4 max-[1000px]:max-w-[370px] max-[1000px]:mx-auto">
            <FlightCalendar flightData={flightData} />
            {seatConfigData && !configLoading && (
              <VariantAnalysis
                flightData={flightData}
                seatConfigData={seatConfigData}
                airline={airline || ''}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
} 