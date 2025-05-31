import React from 'react';
import type { AwardFinderResults } from '@/types/award-finder-results';
import AwardFinderResultsComponent from '@/components/award-finder/award-finder-results-component';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';

interface AwardFinderResultsCardProps {
  results: AwardFinderResults;
  sortBy: string;
  onSortByChange: (value: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  reliableOnly: boolean;
  onReliableOnlyChange: (checked: boolean) => void;
  reliability: Record<string, { min_count: number }>;
  reliabilityLoading: boolean;
  filterReliable: (results: AwardFinderResults) => AwardFinderResults;
  flattenItineraries: (results: AwardFinderResults) => Array<{ route: string; date: string; itinerary: string[] }>;
  getSortValue: (card: any, results: AwardFinderResults, sortBy: string, reliability: Record<string, { min_count: number }>, minReliabilityPercent: number) => number;
  PAGE_SIZE: number;
  sortOptions: { value: string; label: string }[];
  minReliabilityPercent: number;
}

const AwardFinderResultsCard: React.FC<AwardFinderResultsCardProps> = ({
  results,
  sortBy,
  onSortByChange,
  page,
  onPageChange,
  reliableOnly,
  onReliableOnlyChange,
  reliability,
  reliabilityLoading,
  filterReliable,
  flattenItineraries,
  getSortValue,
  PAGE_SIZE,
  sortOptions,
  minReliabilityPercent,
}) => {
  return (
    <div className="mt-8 w-full flex flex-col items-center">
      <div className="w-full max-w-4xl mx-auto flex flex-row items-center justify-between mb-4 gap-2">
        <label className="flex items-center gap-1 text-sm">
          <Checkbox
            id="reliableOnly"
            checked={reliableOnly}
            onCheckedChange={onReliableOnlyChange}
            className="mr-2"
          />
          <span>Reliable results</span>
        </label>
        <div className="flex items-center w-fit gap-2">
          <label htmlFor="sort" className="text-sm text-muted-foreground mr-2">Sort:</label>
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-56" id="sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Results Table with Pagination */}
      {reliableOnly && reliabilityLoading ? (
        <div className="text-muted-foreground flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></span>Loading results...</div>
      ) : (
        (() => {
          const filteredResults = filterReliable(results);
          let cards = flattenItineraries(filteredResults);
          cards = cards.sort((a, b) => {
            const aVal = getSortValue(a, filteredResults, sortBy, reliability, minReliabilityPercent);
            const bVal = getSortValue(b, filteredResults, sortBy, reliability, minReliabilityPercent);
            if (aVal === bVal) {
              // Secondary sort by duration (shorter first)
              const aDuration = getSortValue(a, filteredResults, 'duration', reliability, minReliabilityPercent);
              const bDuration = getSortValue(b, filteredResults, 'duration', reliability, minReliabilityPercent);
              return aDuration - bDuration;
            }
            if (["arrival", "y", "w", "j", "f"].includes(sortBy)) {
              return bVal - aVal;
            }
            return aVal - bVal;
          });
          const totalPages = Math.ceil(cards.length / PAGE_SIZE);
          const pagedCards = cards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
          return <>
            <AwardFinderResultsComponent
              cards={pagedCards}
              flights={filteredResults.flights}
              reliability={reliability}
              minReliabilityPercent={minReliabilityPercent}
            />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </>;
        })()
      )}
    </div>
  );
};

export default AwardFinderResultsCard; 