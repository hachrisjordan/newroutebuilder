import React from 'react';
import Image from 'next/image';
import { X, Check, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getAirlineLogoSrc } from '@/lib/utils';
import type { Flight } from '@/types/award-finder-results';
import PricingValue from './pricing-value';

interface FlightCardProps {
  flight: Flight;
  segment: string;
  depDiff: number;
  arrDiff: number;
  code: string;
  isDark: boolean;
  iataToCity: Record<string, string>;
  reliability: Record<string, { min_count: number; exemption?: string }>;
  layover?: React.ReactNode;
  aircraft?: string;
  cityError?: string | null;
  isLoadingCities?: boolean;
}

function formatIsoTime(iso: string) {
  // Returns 'HH:mm' from ISO string, without local time conversion
  const [, time] = iso.split('T');
  return time ? time.slice(0, 5) : '';
}

function formatDurationHM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const FlightCard: React.FC<FlightCardProps> = ({
  flight: f,
  segment,
  depDiff,
  arrDiff,
  code,
  isDark,
  iataToCity,
  reliability,
  layover,
  aircraft,
  cityError,
  isLoadingCities,
}) => {
  // Helper to extract IATA codes from segment string
  function extractIatas(segment: string): [string, string] {
    // e.g., 'Bangkok (BKK) → Tokyo (NRT)'
    const matches = [...segment.matchAll(/\(([A-Z0-9]{3})\)/g)];
    if (matches.length >= 2) {
      return [matches[0][1], matches[1][1]];
    }
    return ['', ''];
  }
  const [depIata, arrIata] = extractIatas(segment);
  const program = 'AC';

  return (
    <>
      {layover}
      <div className="flex flex-col gap-0.5 py-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-1 md:gap-0">
          <div className="flex flex-col w-full md:flex-row md:items-center md:gap-6">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="font-semibold text-primary break-words whitespace-normal">{segment}</span>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto mt-1 md:mt-0 md:ml-auto justify-end">
              <div className="flex w-full md:w-auto">
                <span className="inline md:hidden text-sm font-mono text-muted-foreground font-bold flex-1 text-left">{f.TotalDuration ? formatDurationHM(f.TotalDuration) : ''}</span>
                <span className="inline md:hidden flex-1 text-right">
                  <span className="text-sm font-medium">
                    {formatIsoTime(f.DepartsAt)}
                    {depDiff !== 0 ? (
                      <span className="text-xs text-muted-foreground ml-1">{depDiff > 0 ? `(+${depDiff})` : `(${depDiff})`}</span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-sm font-medium">
                    {formatIsoTime(f.ArrivesAt)}
                    {arrDiff !== 0 ? (
                      <span className="text-xs text-muted-foreground ml-1">{arrDiff > 0 ? `(+${arrDiff})` : `(${arrDiff})`}</span>
                    ) : null}
                  </span>
                </span>
              </div>
              <span className="hidden md:inline text-sm font-mono text-muted-foreground font-bold">{f.TotalDuration ? formatDurationHM(f.TotalDuration) : ''}</span>
              <span className="hidden md:flex items-center gap-2">
                <span className="text-sm font-medium">
                  {formatIsoTime(f.DepartsAt)}
                  {depDiff !== 0 ? (
                    <span className="text-xs text-muted-foreground ml-1">{depDiff > 0 ? `(+${depDiff})` : `(${depDiff})`}</span>
                  ) : null}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-medium">
                  {formatIsoTime(f.ArrivesAt)}
                  {arrDiff !== 0 ? (
                    <span className="text-xs text-muted-foreground ml-1">{arrDiff > 0 ? `(+${arrDiff})` : `(${arrDiff})`}</span>
                  ) : null}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-row items-center justify-between w-full mt-1">
          <div className="flex items-center gap-2">
            <Image
              src={getAirlineLogoSrc(code, isDark)}
              alt={code}
              width={20}
              height={20}
              className="inline-block align-middle rounded-md"
              style={{ objectFit: 'contain' }}
            />
            <span className="font-mono text-sm">{f.FlightNumbers}</span>
            <span className="text-xs text-muted-foreground ml-1">({f.Aircraft})</span>
          </div>
          <div className="flex items-center gap-2">
            {(['Y', 'W', 'J', 'F'] as const).map((cls, idx) => {
              const count =
                cls === 'Y' ? f.YCount :
                cls === 'W' ? f.WCount :
                cls === 'J' ? f.JCount :
                f.FCount;
              const rel = reliability[code];
              const min = rel?.min_count ?? 1;
              const exemption = rel?.exemption || '';
              const minCount = exemption.includes(cls) ? 1 : min;
              let icon = null;
              if (!count) {
                icon = <X className="text-red-400 h-4 w-4" />;
              } else if (count < minCount) {
                icon = (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span><AlertTriangle className="text-yellow-500 h-4 w-4" /></span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      This flight likely has dynamic pricing and may not be available on partner programs.
                    </TooltipContent>
                  </Tooltip>
                );
              } else {
                icon = <Check className="text-green-600 h-4 w-4" />;
              }
              return (
                <span key={cls} className="flex items-center gap-1 text-xs">
                  {cls} {icon}
                </span>
              );
            })}
          </div>
        </div>
        {/* PricingValue component */}
        <PricingValue
          flight={f}
          depIata={depIata}
          arrIata={arrIata}
          airline={code}
          distance={undefined}
          program={program}
          className="mt-2"
          classAvailability={{
            Y: !!f.YCount,
            W: !!f.WCount,
            J: !!f.JCount,
            F: !!f.FCount,
          }}
        />
      </div>
    </>
  );
};

export default FlightCard; 