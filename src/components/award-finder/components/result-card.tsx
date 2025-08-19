import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, Check, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipTouch } from '@/components/ui/tooltip-touch';
import ExpandFade from '@/components/ui/expand-fade';
import { ClassBar } from './class-bar';
import { PricingDisplay } from './pricing-display';
import { FlightDetails } from './flight-details';
import { getClassPercentages, getTotalDuration } from '@/lib/utils';
import { formatTime, getDayDiff } from '../utils/award-finder-utils';
import type { Flight } from '@/types/award-finder-results';

interface ResultCardProps {
  card: { route: string; date: string; itinerary: string[] };
  cardIndex: number;
  flights: Record<string, Flight>;
  reliability: Record<string, { min_count: number; exemption?: string }>;
  iataToCity: Record<string, string>;
  isLoadingCities: boolean;
  cityError: string | null;
  isDark: boolean;
  expanded: string | null;
  expandedFlightNumbers: string | null;
  selectedPrograms: Record<string, Record<string, string>>;
  allianceData: Record<string, Array<{code: string, name: string, ffp: string}>>;
  allAirlines: Array<{code: string, name: string, ffp: string, bonus: string[], recommend: string[]}>;
  liveSearchResults: Record<string, any>;
  verifyingCards: Set<string>;
  seats: number;
  onToggle: (key: string) => void;
  onFlightNumbersToggle: (key: string) => void;
  onProgramSelection: (cardKey: string, segmentKey: string, value: string) => void;
  onVerifyClick: (cardKey: string) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  card,
  cardIndex,
  flights,
  reliability,
  iataToCity,
  isLoadingCities,
  cityError,
  isDark,
  expanded,
  expandedFlightNumbers,
  selectedPrograms,
  allianceData,
  allAirlines,
  liveSearchResults,
  verifyingCards,
  seats,
  onToggle,
  onFlightNumbersToggle,
  onProgramSelection,
  onVerifyClick
}) => {
  const cardKey = `${card.route}-${card.date}-${cardIndex}`;
  const isOpen = expanded === cardKey;
  const isFlightNumbersOpen = expandedFlightNumbers === cardKey;
  const flightsArr = card.itinerary.map(id => flights[id]).filter(Boolean);
  const totalDuration = getTotalDuration(flightsArr);
  const classPercentages = getClassPercentages(flightsArr);
  const cardLiveSearchResults = liveSearchResults[cardKey] || {};
  const isVerifying = verifyingCards.has(cardKey);

  return (
    <Card key={cardKey} className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">{card.route}</h3>
                <span className="text-sm text-muted-foreground">{card.date}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Duration: {totalDuration}</span>
                <span>Flights: {flightsArr.length}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggle(cardKey)}
                className="h-8 px-3"
              >
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {isOpen ? 'Hide' : 'Show'} Details
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFlightNumbersToggle(cardKey)}
                className="h-8 px-3"
              >
                {isFlightNumbersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Flight Numbers
              </Button>
            </div>
          </div>

          {/* Class Percentages */}
          <div className="flex flex-wrap gap-4">
            {Object.entries(classPercentages).map(([className, percentage]) => (
              <ClassBar key={className} label={className} percent={percentage} />
            ))}
          </div>

          {/* Flight Numbers */}
          <ExpandFade show={isFlightNumbersOpen}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              {flightsArr.map((flight, index) => {
                const depTime = formatTime(flight.DepartsAt);
                const arrTime = formatTime(flight.ArrivesAt);
                const dayDiff = getDayDiff(card.date, flight.ArrivesAt);
                const dayLabel = dayDiff > 0 ? `+${dayDiff}` : dayDiff < 0 ? `${dayDiff}` : '';
                
                return (
                  <div key={flight.FlightNumbers} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    <div className="flex-1">
                      <div className="font-mono font-bold text-lg">{flight.FlightNumbers}</div>
                      <div className="text-sm text-muted-foreground">
                        {depTime} → {arrTime} {dayLabel && <span className="text-blue-600">({dayLabel})</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ExpandFade>

          {/* Live Search Results */}
          {(() => {
            const results = Object.values(cardLiveSearchResults);
            if (results.length === 0) return null;

            return (
              <div className="space-y-4">
                <h4 className="font-semibold text-green-600 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Live Search Results
                </h4>
                
                {results.map((result: any, resultIndex: number) => {
                  const { data, routes, program } = result;
                  const matchingFlights = data?.itinerary?.map((itinerary: any) => {
                    const segments = itinerary.segments || [];
                    const pricing = itinerary.bundles || [];
                    return { segments, pricing };
                  }) || [];

                  return (
                    <div key={resultIndex} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <div className="font-semibold text-green-800 dark:text-green-200">
                            {routes.join(' + ')} via {program}
                          </div>
                          <div className="text-sm text-green-600 dark:text-green-300">
                            {matchingFlights.length} itinerary options found
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {/* Program Selection */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Recommended Program:</span>
                            <Select
                              value={selectedPrograms[cardKey]?.[routes[0]] || ''}
                              onValueChange={(value) => onProgramSelection(cardKey, routes[0], value)}
                            >
                              <SelectTrigger className="w-48 h-8 text-xs">
                                <SelectValue placeholder="Select recommended program" />
                              </SelectTrigger>
                              <SelectContent>
                                {allAirlines
                                  .filter(airline => airline.recommend.includes(program))
                                  .map((airline) => (
                                    <SelectItem 
                                      key={airline.code} 
                                      value={airline.code}
                                      className="font-bold text-green-600"
                                    >
                                      {airline.name} {airline.ffp}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Live Search Pricing */}
                          <PricingDisplay pricing={matchingFlights[0]?.pricing} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Flight Details Expansion */}
          <ExpandFade show={isOpen}>
            <>
              <div className="w-full flex justify-center my-2">
                <div className="h-px w-full bg-muted" />
              </div>
              <FlightDetails
                flightsArr={flightsArr}
                route={card.route}
                date={card.date}
                iataToCity={iataToCity}
                reliability={reliability}
                isLoadingCities={isLoadingCities}
                cityError={cityError}
                isDark={isDark}
              />
            </>
          </ExpandFade>
        </div>
      </CardContent>
    </Card>
  );
};