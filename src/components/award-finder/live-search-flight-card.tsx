import React from 'react';
import Image from 'next/image';
import { getAirlineLogoSrc } from '@/lib/utils';

interface LiveSearchFlightCardProps {
  segment: string;
  depTime: string;
  arrTime: string;
  depDiff: number;
  arrDiff: number;
  code: string;
  flightNumber: string;
  aircraft: string;
  isDark: boolean;
  duration: number;
}

function formatIsoTime(iso: string) {
  const [, time] = iso.split('T');
  return time ? time.slice(0, 5) : '';
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const LiveSearchFlightCard: React.FC<LiveSearchFlightCardProps> = ({
  segment,
  depTime,
  arrTime,
  depDiff,
  arrDiff,
  code,
  flightNumber,
  aircraft,
  isDark,
  duration,
}) => {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-1 md:gap-0">
        <div className="flex flex-col w-full md:flex-row md:items-center md:gap-6">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="font-semibold text-primary break-words whitespace-normal">{segment}</span>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto mt-1 md:mt-0 md:ml-auto justify-end">
            <span className="inline md:hidden text-sm font-mono text-muted-foreground font-bold flex-1 text-left">{formatDuration(duration)}</span>
            <span className="inline md:hidden flex-1 text-right">
              <span className="text-sm font-medium">
                {formatIsoTime(depTime)}
                {depDiff !== 0 ? (
                  <span className="text-xs text-muted-foreground ml-1">{depDiff > 0 ? `(+${depDiff})` : `(${depDiff})`}</span>
                ) : null}
              </span>
              <span className="text-muted-foreground"> → </span>
              <span className="text-sm font-medium">
                {formatIsoTime(arrTime)}
                {arrDiff !== 0 ? (
                  <span className="text-xs text-muted-foreground ml-1">{arrDiff > 0 ? `(+${arrDiff})` : `(${arrDiff})`}</span>
                ) : null}
              </span>
            </span>
            <span className="hidden md:inline text-sm font-mono text-muted-foreground font-bold">{formatDuration(duration)}</span>
            <span className="hidden md:flex items-center gap-2">
              <span className="text-sm font-medium">
                {formatIsoTime(depTime)}
                {depDiff !== 0 ? (
                  <span className="text-xs text-muted-foreground ml-1">{depDiff > 0 ? `(+${depDiff})` : `(${depDiff})`}</span>
                ) : null}
              </span>
              <span className="text-muted-foreground"> → </span>
              <span className="text-sm font-medium">
                {formatIsoTime(arrTime)}
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
          <span className="font-mono text-sm">{flightNumber}</span>
          <span className="text-xs text-muted-foreground ml-1">({aircraft})</span>
        </div>
      </div>
    </div>
  );
};

export default LiveSearchFlightCard; 