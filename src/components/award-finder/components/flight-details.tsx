import React from 'react';
import { getAirlineCode, getDayDiffFromItinerary } from '../utils/award-finder-utils';
import { formatLayoverDuration } from '../utils/award-finder-utils';
import FlightCard from '../flight-card';
import type { Flight } from '@/types/award-finder-results';

interface FlightDetailsProps {
  flightsArr: Flight[];
  route: string;
  date: string;
  iataToCity: Record<string, string>;
  reliability: Record<string, { min_count: number; exemption?: string }>;
  isLoadingCities: boolean;
  cityError: string | null;
  isDark: boolean;
}

export const FlightDetails: React.FC<FlightDetailsProps> = ({
  flightsArr,
  route,
  date,
  iataToCity,
  reliability,
  isLoadingCities,
  cityError,
  isDark
}) => {
  return (
    <div className="px-4 pb-4">
      <div className="flex flex-col gap-3">
        {flightsArr.map((f, i) => {
          // Find segment path: e.g., SEA-AMS
          const segs = route.split('-');
          let segment = '';
          if (i === 0) {
            const fromIata = segs[0];
            const toIata = segs[1] || '';
            const fromCity = iataToCity[fromIata] || fromIata;
            const toCity = iataToCity[toIata] || toIata;
            segment = `${fromCity} (${fromIata}) → ${toCity} (${toIata})`;
          } else {
            const fromIata = segs[i];
            const toIata = segs[i + 1] || '';
            const fromCity = iataToCity[fromIata] || fromIata;
            const toCity = iataToCity[toIata] || toIata;
            segment = `${fromCity} (${fromIata}) → ${toCity} (${toIata})`;
          }
          const code = getAirlineCode(f.FlightNumbers);
          // Map reliability to Record<string, { min_count: number; exemption?: string }> for this segment
          const reliabilityMap: Record<string, { min_count: number; exemption?: string }> = {};
          reliabilityMap[code] = reliability[code] ?? { min_count: 1 };
          // Layover calculation
          let layover = null;
          if (i > 0) {
            const prev = flightsArr[i - 1];
            const prevArrive = new Date(prev.ArrivesAt).getTime();
            const currDepart = new Date(f.DepartsAt).getTime();
            const diffMin = Math.max(0, Math.round((currDepart - prevArrive) / (1000 * 60)));
            if (diffMin > 0) {
              const at = segs[i];
              const cityName = iataToCity[at] || at;
              layover = `Layover at ${cityName} (${at}) for ${formatLayoverDuration(diffMin)}`;
            }
          }
          // For each flight, calculate day difference from reference date
          const depDiff = getDayDiffFromItinerary(date, f.DepartsAt);
          const arrDiff = getDayDiffFromItinerary(date, f.ArrivesAt);
          return (
            <FlightCard
              key={f.FlightNumbers + i}
              flight={f}
              segment={segment}
              depDiff={depDiff}
              arrDiff={arrDiff}
              code={code}
              isDark={isDark}
              iataToCity={iataToCity}
              reliability={reliabilityMap}
              layover={layover}
              cityError={cityError}
              isLoadingCities={isLoadingCities}
            />
          );
        })}
      </div>
    </div>
  );
};