import { Card, CardContent } from '@/components/ui/card';
import type { AwardFinderResults, Flight } from '@/types/award-finder-results';
import React from 'react';
import Image from 'next/image';
import { Progress } from '../ui/progress';

interface AwardFinderResultsProps {
  results: AwardFinderResults;
}

const formatTime = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getDayDiff = (baseDate: string, compareIso: string) => {
  // baseDate: 'YYYY-MM-DD', compareIso: ISO string
  const base = new Date(baseDate + 'T00:00:00Z');
  const compare = new Date(compareIso);
  // Calculate UTC day difference
  const diff = Math.floor((compare.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

const getTotalDuration = (flights: Flight[]) => {
  let total = 0;
  for (let i = 0; i < flights.length; i++) {
    total += flights[i].TotalDuration;
    if (i > 0) {
      const prevArrive = new Date(flights[i - 1].ArrivesAt).getTime();
      const currDepart = new Date(flights[i].DepartsAt).getTime();
      const layover = Math.max(0, Math.round((currDepart - prevArrive) / (1000 * 60)));
      total += layover;
    }
  }
  return total;
};

const getClassPercentages = (flights: Flight[]) => {
  const totalDuration = flights.reduce((sum, f) => sum + f.TotalDuration, 0);
  // Y: 100% if all flights have YCount > 0, else 0%
  const y = flights.every(f => f.YCount > 0) ? 100 : 0;

  // Helper to check if any flight has a higher class
  const hasHigher = (classKey: 'WCount' | 'JCount' | 'FCount', higherKeys: string[]) =>
    flights.some(f => higherKeys.some(hk => (f as any)[hk] > 0));

  // W: at least 1 WCount > 0, and all flights have at most W (no J or F)
  let w = 0;
  if (
    flights.some(f => f.WCount > 0) &&
    !hasHigher('WCount', ['JCount', 'FCount'])
  ) {
    const wDuration = flights.filter(f => f.WCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
    w = Math.round((wDuration / totalDuration) * 100);
  }

  // J: at least 1 JCount > 0, and all flights have at most J (no F)
  let j = 0;
  if (
    flights.some(f => f.JCount > 0) &&
    !hasHigher('JCount', ['FCount'])
  ) {
    const jDuration = flights.filter(f => f.JCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
    j = Math.round((jDuration / totalDuration) * 100);
  }

  // F: at least 1 FCount > 0
  let f = 0;
  if (flights.some(f => f.FCount > 0)) {
    const fDuration = flights.filter(f => f.FCount > 0).reduce((sum, f) => sum + f.TotalDuration, 0);
    f = Math.round((fDuration / totalDuration) * 100);
  }

  return { y, w, j, f };
};

const getAirlineCode = (flightNumber: string) => flightNumber.slice(0, 2).toUpperCase();

const classBarColors: Record<string, string> = {
  Y: 'bg-[#E8E1F2]',
  W: 'bg-[#B8A4CC]',
  J: 'bg-[#F3CD87]',
  F: 'bg-[#D88A3F]',
};

interface ClassBarProps {
  label: string;
  percent: number;
}

const ClassBar: React.FC<ClassBarProps> = ({ label, percent }) => (
  <div className="flex items-center min-w-[60px] gap-1">
    <div className="relative w-16 h-3">
      <div className={`absolute left-0 top-0 h-3 rounded-full transition-all duration-200 w-full bg-muted`} />
      <div
        className={`absolute left-0 top-0 h-3 rounded-full transition-all duration-200 ${classBarColors[label]}`}
        style={{ width: `${percent}%` }}
      />
      <span
        className={`absolute left-1 top-0 text-[10px] font-bold select-none ${percent === 0 ? 'text-black dark:text-white' : 'text-gray-700 dark:text-black'}`}
        style={{ lineHeight: '0.75rem' }}
      >
        {label}
      </span>
    </div>
    <span className="text-xs font-mono w-7 text-right">{percent}%</span>
  </div>
);

const AwardFinderResults: React.FC<AwardFinderResultsProps> = ({ results }) => {
  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      {Object.entries(results.itineraries).map(([route, dates]) =>
        Object.entries(dates).map(([date, itineraries]) =>
          itineraries.map((itinerary, idx) => {
            const flights: Flight[] = itinerary.map(id => results.flights[id]);
            const firstFlight = flights[0];
            const lastFlight = flights[flights.length - 1];
            const dayDiff = getDayDiff(date, lastFlight.ArrivesAt);
            const totalDuration = getTotalDuration(flights);
            const { y, w, j, f } = getClassPercentages(flights);
            return (
              <Card key={`${route}-${date}-${idx}`} className="rounded-xl border bg-card shadow transition-all cursor-pointer">
                <CardContent className="flex flex-col md:flex-row items-center justify-between py-4 gap-2 p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                    <span className="font-semibold text-lg text-primary">{route}</span>
                    <span className="text-muted-foreground text-sm md:ml-4">{date}</span>
                  </div>
                  <div className="flex flex-row items-center gap-6 w-full justify-end">
                    <span className="text-muted-foreground text-sm font-mono whitespace-nowrap font-bold">{formatDuration(totalDuration)}</span>
                    <span className="text-sm font-medium">{formatTime(firstFlight.DepartsAt)}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-sm font-medium">
                      {formatTime(lastFlight.ArrivesAt)}
                      {dayDiff > 0 && <span className="text-xs text-muted-foreground ml-1">(+{dayDiff})</span>}
                    </span>
                  </div>
                </CardContent>
                <div className="px-6 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
                  <div className="flex flex-wrap gap-2 items-center">
                    {flights.map((f, i) => {
                      const code = getAirlineCode(f.FlightNumbers);
                      return (
                        <span key={f.FlightNumbers + i} className="flex items-center gap-1">
                          <Image
                            src={`/${code}.png`}
                            alt={code}
                            width={24}
                            height={24}
                            className="inline-block align-middle rounded-md"
                            style={{ objectFit: 'contain' }}
                          />
                          <span className="font-mono">{f.FlightNumbers}</span>
                          {i < flights.length - 1 && <span className="mx-1 text-muted-foreground">/</span>}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-4 items-center">
                    <ClassBar label="Y" percent={y} />
                    <ClassBar label="W" percent={w} />
                    <ClassBar label="J" percent={j} />
                    <ClassBar label="F" percent={f} />
                  </div>
                </div>
              </Card>
            );
          })
        )
      )}
    </div>
  );
};

export { AwardFinderResults };

export const __awardFinderResultsIsComponent = true; 