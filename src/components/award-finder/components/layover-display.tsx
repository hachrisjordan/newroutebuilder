import React from 'react';
import { formatLayoverDuration } from '../utils/award-finder-utils';

interface LayoverDisplayProps {
  layover: React.ReactNode;
  isLoadingCities: boolean;
  cityError: string | null;
}

export const LayoverDisplay: React.FC<LayoverDisplayProps> = ({ 
  layover, 
  isLoadingCities, 
  cityError 
}) => {
  if (!layover) return null;

  return (
    <div className="flex items-center w-full my-2">
      <div className="flex-1 h-px bg-muted" />
      <span className="mx-3 text-xs text-muted-foreground font-mono">
        {layover}
        {isLoadingCities && <span className="ml-2 animate-pulse text-muted-foreground"></span>}
        {cityError && <span className="ml-2 text-red-500">(city error)</span>}
      </span>
      <div className="flex-1 h-px bg-muted" />
    </div>
  );
};