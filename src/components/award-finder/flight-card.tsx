import React from 'react';
import Image from 'next/image';
import { X, Check, AlertTriangle, DollarSign } from 'lucide-react';
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

const ENABLE_PRICING = false;

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

  return (
    <>
      {layover}
      <div className="flex flex-col gap-0.5 py-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-1 md:gap-0">
          <div className="flex flex-col w-full md:flex-row md:items-center md:gap-6">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="font-semibold text-primary break-words whitespace-normal">{segment}</span>
              {/* Money icon if no green check for any class */}
              {(() => {
                const rel = reliability[code];
                const min = rel?.min_count ?? 1;
                const exemption = rel?.exemption || '';
                const classCounts = [
                  { cls: 'Y', count: f.YCount },
                  { cls: 'W', count: f.WCount },
                  { cls: 'J', count: f.JCount },
                  { cls: 'F', count: f.FCount },
                ];
                const hasGreenCheck = classCounts.some(({ cls, count }) => {
                  const minCount = exemption.includes(cls) ? 1 : min;
                  return count >= minCount;
                });
                if (!hasGreenCheck) {
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          tabIndex={0}
                          aria-label="Repositioning / Cash flight"
                          className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          style={{ touchAction: 'manipulation' }}
                        >
                          <DollarSign className="text-emerald-600 h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        <div>Repositioning / Cash flight</div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return null;
              })()}
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
                  <span className="text-muted-foreground"> → </span>
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
                <span className="text-muted-foreground"> → </span>
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
                      <button
                        type="button"
                        tabIndex={0}
                        aria-label="Unreliable availability warning"
                        className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        style={{ touchAction: 'manipulation' }}
                      >
                        <AlertTriangle className="text-yellow-500 h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      <div>
                        This flight likely has dynamic pricing and may not be available on partner programs.
                      </div>
                      <div className="mt-2 font-medium">
                        For best results, look for flights with a green check.
                      </div>
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
        {ENABLE_PRICING && (
          <PricingValue
            flight={f}
            depIata={depIata}
            arrIata={arrIata}
            airline={code}
            distance={undefined}
            className="mt-2"
            classAvailability={{
              Y: !!f.YCount,
              W: !!f.WCount,
              J: !!f.JCount,
              F: !!f.FCount,
            }}
            classReliability={{
              Y: (() => {
                const count = f.YCount;
                const rel = reliability[code];
                const min = rel?.min_count ?? 1;
                const exemption = rel?.exemption || '';
                const minCount = exemption.includes('Y') ? 1 : min;
                return count >= minCount;
              })(),
              W: (() => {
                const count = f.WCount;
                const rel = reliability[code];
                const min = rel?.min_count ?? 1;
                const exemption = rel?.exemption || '';
                const minCount = exemption.includes('W') ? 1 : min;
                return count >= minCount;
              })(),
              J: (() => {
                const count = f.JCount;
                const rel = reliability[code];
                const min = rel?.min_count ?? 1;
                const exemption = rel?.exemption || '';
                const minCount = exemption.includes('J') ? 1 : min;
                return count >= minCount;
              })(),
              F: (() => {
                const count = f.FCount;
                const rel = reliability[code];
                const min = rel?.min_count ?? 1;
                const exemption = rel?.exemption || '';
                const minCount = exemption.includes('F') ? 1 : min;
                return count >= minCount;
              })(),
            }}
          />
        )}
      </div>
    </>
  );
};

export default FlightCard; 