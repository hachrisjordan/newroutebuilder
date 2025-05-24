'use client';

import { SeatTypeDelaySearch } from '@/components/seat-type-delay-search';
import { useState } from 'react';
import { FlightCalendar } from '@/components/flight-calendar';

export default function SeatTypeDelayPage() {
  const [flightData, setFlightData] = useState<any[]>([]);

  const handleSearch = (params: {
    airline: string | undefined;
    flightNumber: string;
    originAirport: string | undefined;
    arrivalAirport: string | undefined;
    flightData?: any;
  }) => {
    if (params.flightData) {
      setFlightData(params.flightData);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center pt-8 px-4">
      <div className="flex flex-col gap-6 items-center w-full">
        <SeatTypeDelaySearch onSearch={handleSearch} />
        {flightData.length > 0 && (
          <div className="w-full flex justify-center">
            <FlightCalendar flightData={flightData} />
          </div>
        )}
      </div>
    </div>
  );
} 