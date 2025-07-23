'use client';
import { Card, CardContent } from '@/components/ui/card';
import { format, toZonedTime } from 'date-fns-tz';
import { getAirportTimezone } from '@/lib/airport-tz-map';
import Image from 'next/image';
import { differenceInCalendarDays } from 'date-fns';
import { getAirlineLogoSrc } from '@/lib/utils';
import { Link as LinkIcon } from 'lucide-react';
import ExpandFade from '@/components/ui/expand-fade';

interface Itinerary {
  id: string;
  from_airport: string;
  to_airport: string;
  connections: string[];
  depart: string;
  arrive: string;
  duration: number;
  segment_ids: string[];
  layover: number;
  points: number;
  fare_tax: number;
  cabin_class: string;
  inventory_quantity: number;
}

interface Segment {
  id: string;
  from_airport: string;
  to_airport: string;
  aircraft: string;
  depart: string;
  arrive: string;
  flightno: string;
  duration: number;
  layover: number;
  bookingclass: string;
  cabinclass: string;
  operating_airline_code: string;
  distance: number;
}

interface EtihadItineraryCardProps {
  itinerary: Itinerary;
  segments: Segment[];
  expanded?: boolean;
  onToggle?: () => void;
  iataToCity: Record<string, string>;
  isLoadingCities?: boolean;
}

function formatIsoTime(iso: string, iata: string) {
  const tz = getAirportTimezone(iata);
  if (!tz) return iso.slice(11, 16); // fallback to raw time
  const zoned = toZonedTime(iso + 'Z', tz); // ensure UTC input
  return format(zoned, 'HH:mm');
}

function getDayDiff(depIso: string, depIata: string, arrIso: string, arrIata: string) {
  const depTz = getAirportTimezone(depIata);
  const arrTz = getAirportTimezone(arrIata);
  if (!depTz || !arrTz) return 0;
  const dep = toZonedTime(depIso + 'Z', depTz);
  const arr = toZonedTime(arrIso + 'Z', arrTz);
  return differenceInCalendarDays(arr, dep);
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function buildPath(from: string, connections: string[], to: string) {
  return [from, ...connections, to].join('-');
}

function getAircraftName(code: string) {
  if (code === '351') return 'Airbus A350-1000';
  if (code === '359') return 'Airbus A350-900';
  if (code === '789') return 'Boeing 787-9';
  if (code === '781') return 'Boeing 787-10';
  if (code === '788') return 'Boeing 787-8';
  if (code === '32A') return 'Airbus A320';
  if (code === '380') return 'Airbus A380-800';
  if (code === 'A321') return 'Airbus A321';
  if (code === 'A320') return 'Airbus A320';
  if (code === 'Airbus 330-300') return 'Airbus A330-300';
  return code;
}

// Returns yyyy-MM-dd in local time for a given ISO and IATA
function getLocalYMD(iso: string, iata: string) {
  const tz = getAirportTimezone(iata);
  if (!tz) return iso.slice(0, 10);
  const zoned = toZonedTime(iso + 'Z', tz);
  return format(zoned, 'yyyy-MM-dd');
}

// Returns day difference between itinerary local date and segment arrival local date
function getDayDiffFromItinerary(itineraryDate: string, arrIso: string, arrIata: string) {
  const itinYMD = itineraryDate;
  const arrYMD = getLocalYMD(arrIso, arrIata);
  const itinDate = new Date(itinYMD);
  const arrDate = new Date(arrYMD);
  return Math.floor((arrDate.getTime() - itinDate.getTime()) / (1000 * 60 * 60 * 24));
}

const EtihadItineraryCard: React.FC<EtihadItineraryCardProps> = ({ itinerary, segments, expanded, onToggle, iataToCity, isLoadingCities }) => {
  const path = buildPath(itinerary.from_airport, itinerary.connections, itinerary.to_airport);
  const date = format(toZonedTime(itinerary.depart + 'Z', getAirportTimezone(itinerary.from_airport) || 'UTC'), 'yyyy-MM-dd');
  const totalDuration = itinerary.duration;
  const depLocal = formatIsoTime(itinerary.depart, itinerary.from_airport);
  const arrLocal = formatIsoTime(itinerary.arrive, itinerary.to_airport);
  const arrDayDiff = getDayDiffFromItinerary(date, itinerary.arrive, itinerary.to_airport);
  return (
    <Card className="rounded-xl border bg-card shadow transition-all cursor-pointer">
      <div onClick={onToggle} className="flex items-center justify-between">
        <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-2 p-4 w-full">
          <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
            <span className="font-semibold text-lg text-primary">{path}</span>
            <span className="text-muted-foreground text-sm md:ml-4">{date}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-6 mt-2 md:mt-0 ml-auto">
            <div className="flex items-center gap-6">
              <span className="text-sm font-mono text-muted-foreground font-bold whitespace-nowrap">{formatDuration(totalDuration)}</span>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-sm font-medium">{depLocal}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-medium">
                  {arrLocal}
                  {arrDayDiff > 0 && <span className="text-xs text-muted-foreground ml-1">(+{arrDayDiff})</span>}
                </span>
              </div>
            </div>
            <span className="self-end md:self-center">
              {expanded ? (
                <svg className="h-5 w-5 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
              ) : (
                <svg className="h-5 w-5 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              )}
            </span>
          </div>
        </CardContent>
      </div>
      <div className="px-6 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
        <div className="flex flex-wrap gap-2 items-center">
          {segments.map((seg, i) => (
            <span key={seg.id} className="flex items-center gap-1">
              <Image
                src={`/${seg.operating_airline_code}.png`}
                alt={seg.operating_airline_code}
                width={24}
                height={24}
                className="inline-block align-middle rounded-md"
                style={{ objectFit: 'contain' }}
              />
              <span className="font-mono">{seg.flightno}</span>
              {i < segments.length - 1 && <span className="mx-1 text-muted-foreground">/</span>}
            </span>
          ))}
          <a
            href={`https://www.jetblue.com/booking/flights?from=${itinerary.from_airport}&to=${itinerary.to_airport}&depart=${date}&isMultiCity=false&noOfRoute=1&adults=1&children=0&infants=0&sharedMarket=false&roundTripFaresFlag=false&usePoints=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Book on JetBlue"
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
          >
            <LinkIcon className="w-4 h-4" />
          </a>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-sm font-medium flex items-center gap-4">
            <span className="flex items-center gap-1">
              Seats:
              <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#F3CD87', color: '#222' }}>
                {itinerary.inventory_quantity}
              </span>
            </span>
            <span className="flex items-center gap-2">
              Business:
              <span className="rounded px-2 py-0.5 font-mono font-bold text-sm" style={{ background: '#F3CD87', color: '#222' }}>
                {itinerary.points.toLocaleString()}
              </span>
              +
              <span className="font-mono text-sm">
                ${itinerary.fare_tax.toFixed(2)}
              </span>
            </span>
          </span>
        </div>
      </div>
      <ExpandFade show={!!expanded}>
        <>
          <div className="w-full flex justify-center my-2">
            <div className="h-px w-full bg-muted" />
          </div>
          <div className="px-6 pb-4">
            <div className="flex flex-col gap-3">
              {segments.map((seg, i) => {
                const fromIata = seg.from_airport;
                const toIata = seg.to_airport;
                const segmentPath = `${iataToCity[fromIata] || fromIata} (${fromIata}) → ${iataToCity[toIata] || toIata} (${toIata})`;
                const depLocal = formatIsoTime(seg.depart, seg.from_airport);
                const arrLocal = formatIsoTime(seg.arrive, seg.to_airport);
                const depDayDiff = getDayDiffFromItinerary(date, seg.depart, seg.from_airport);
                const arrDayDiff = getDayDiffFromItinerary(date, seg.arrive, seg.to_airport);
                let layoverNode = null;
                if (i > 0) {
                  const prev = segments[i - 1];
                  const prevArrive = new Date(prev.arrive + 'Z').getTime();
                  const currDepart = new Date(seg.depart + 'Z').getTime();
                  const diffMin = Math.max(0, Math.round((currDepart - prevArrive) / (1000 * 60)));
                  if (diffMin > 0) {
                    const layoverCity = iataToCity[fromIata] || fromIata;
                    layoverNode = (
                      <div className="flex items-center w-full my-2">
                        <div className="flex-1 h-px bg-muted" />
                        <span className="mx-3 text-xs text-muted-foreground font-mono">
                          Layover at {layoverCity} ({fromIata}) for {formatDuration(diffMin)}
                        </span>
                        <div className="flex-1 h-px bg-muted" />
                      </div>
                    );
                  }
                }
                const airlineCode = seg.operating_airline_code;
                return (
                  <div key={seg.id} className="flex flex-col gap-1">
                    {layoverNode}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-1 md:gap-0">
                      <div className="flex flex-col w-full md:flex-row md:items-center md:gap-6">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <span className="font-semibold text-primary break-words whitespace-normal">{segmentPath}</span>
                        </div>
                        <div className="flex flex-row justify-between items-center w-full md:w-auto mt-1 md:mt-0 md:ml-auto md:gap-6">
                          <span className="text-sm font-mono text-muted-foreground font-bold">{formatDuration(seg.duration)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {depLocal}
                              {depDayDiff > 0 && <span className="text-xs text-muted-foreground ml-1">(+{depDayDiff})</span>}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-sm font-medium">
                              {arrLocal}
                              {arrDayDiff > 0 && <span className="text-xs text-muted-foreground ml-1">(+{arrDayDiff})</span>}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row items-center gap-2 mt-1">
                      <Image
                        src={getAirlineLogoSrc(airlineCode, false)}
                        alt={airlineCode}
                        width={20}
                        height={20}
                        className="inline-block align-middle rounded-md"
                        style={{ objectFit: 'contain' }}
                      />
                      <span className="font-mono text-sm">{seg.flightno}</span>
                      <span className="text-xs text-muted-foreground ml-1">({getAircraftName(seg.aircraft)})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      </ExpandFade>
    </Card>
  );
};

export default EtihadItineraryCard; 