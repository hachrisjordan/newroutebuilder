import React, { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useTheme } from 'next-themes';
import { useAwardFinderData } from './hooks/use-award-finder-data';
import { useAwardVerification } from './hooks/use-award-verification';
import { ResultCard } from './components/result-card';
import type { Flight } from '@/types/award-finder-results';

interface AwardFinderResultsComponentProps {
  cards: Array<{ route: string; date: string; itinerary: string[] }>; // flat, ordered array
  flights: Record<string, Flight>;
  reliability: Record<string, { min_count: number; exemption?: string }>;
  minReliabilityPercent: number;
  seats?: number; // Add seats parameter from award finder search
}

const AwardFinderResultsComponent: React.FC<AwardFinderResultsComponentProps> = ({ 
  cards, 
  flights, 
  reliability, 
  minReliabilityPercent, 
  seats = 1 
}) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedFlightNumbers, setExpandedFlightNumbers] = useState<string | null>(null);
  const [selectedPrograms, setSelectedPrograms] = useState<Record<string, Record<string, string>>>({});
  
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Custom hooks for data management
  const {
    iataToCity,
    isLoadingCities,
    cityError,
    allianceData,
    allAirlines
  } = useAwardFinderData(cards);

  const {
    verifyingCards,
    liveSearchResults,
    handleVerifyClick
  } = useAwardVerification();

  const handleToggle = (key: string) => {
    setExpanded(expanded === key ? null : key);
  };

  const handleFlightNumbersToggle = (key: string) => {
    setExpandedFlightNumbers(expandedFlightNumbers === key ? null : key);
  };

  const handleProgramSelection = (cardKey: string, segmentKey: string, value: string) => {
    setSelectedPrograms(prev => ({
      ...prev,
      [cardKey]: {
        ...prev[cardKey],
        [segmentKey]: value
      }
    }));
  };

  const handleVerifyClickWrapper = (cardKey: string) => {
    handleVerifyClick(cardKey, selectedPrograms, cards, flights, seats);
  };

  return (
    <div className="w-full">
      <TooltipProvider>
        {cards.map((card, cardIndex) => (
          <ResultCard
            key={`${card.route}-${card.date}-${cardIndex}`}
            card={card}
            cardIndex={cardIndex}
            flights={flights}
            reliability={reliability}
            iataToCity={iataToCity}
            isLoadingCities={isLoadingCities}
            cityError={cityError}
            isDark={isDark}
            expanded={expanded}
            expandedFlightNumbers={expandedFlightNumbers}
            selectedPrograms={selectedPrograms}
            allianceData={allianceData}
            allAirlines={allAirlines}
            liveSearchResults={liveSearchResults}
            verifyingCards={verifyingCards}
            seats={seats}
            onToggle={handleToggle}
            onFlightNumbersToggle={handleFlightNumbersToggle}
            onProgramSelection={handleProgramSelection}
            onVerifyClick={handleVerifyClickWrapper}
          />
        ))}
      </TooltipProvider>
    </div>
  );
};

export default AwardFinderResultsComponent;