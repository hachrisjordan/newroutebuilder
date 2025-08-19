import { useState } from 'react';
import { generateCacheKey, getCachedResult, cacheResult } from '../utils/award-finder-utils';
import type { Flight } from '@/types/award-finder-results';

export interface SelectedPrograms {
  [cardKey: string]: {
    [route: string]: string;
  };
}

export function useAwardVerification() {
  const [verifyingCards, setVerifyingCards] = useState<Set<string>>(new Set());
  const [liveSearchResults, setLiveSearchResults] = useState<Record<string, any>>({});

  const handleVerifyClick = async (
    cardKey: string,
    selectedPrograms: SelectedPrograms,
    cards: Array<{ route: string; date: string; itinerary: string[] }>,
    flights: Record<string, Flight>,
    seats: number
  ) => {
    console.log('Verify button clicked for card:', cardKey);
    console.log('seats:', seats);
    console.log('selectedPrograms:', selectedPrograms);
    
    // Set loading state for this card
    setVerifyingCards(prev => new Set(prev).add(cardKey));
    
    const cardPrograms = selectedPrograms[cardKey] || {};
    const card = cards.find(c => `${c.route}-${c.date}-${cards.indexOf(c)}` === cardKey);
    
    console.log('Found card:', card);
    console.log('Card programs:', cardPrograms);
    
    if (!card || !seats) {
      console.log('Early return - no card or seats');
      setVerifyingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardKey);
        return newSet;
      });
      return;
    }
    
    // Get the segments and their dates
    const segments = card.route.split('-');
    const baseDate = new Date(card.date);
    
    console.log('Segments:', segments);
    console.log('Base date:', baseDate);
    
    // Get the flights for this card
    const cardFlights = card.itinerary.map(id => flights[id]).filter(Boolean);
    
    console.log('Card flights:', cardFlights);
    
    // Get the actual selected segments from the verify dropdowns
    const selectedSegments = Object.keys(cardPrograms).filter(route => 
      cardPrograms[route] && cardPrograms[route] !== ''
    );
    
    console.log('Selected segments:', selectedSegments);
    
    // Check for consecutive segments with the same program to try merging first
    const mergeResults: Record<string, any> = {};
    const individualResults: Record<string, any> = {};
    
    // Group consecutive segments by program
    const segmentGroups: Array<{routes: string[], program: string, startSegment: string, endSegment: string}> = [];
    let currentGroup: {routes: string[], program: string, startSegment: string, endSegment: string} | null = null;
    
    selectedSegments.sort().forEach(route => {
      const [startSegment, endSegment] = route.split('-');
      const program = cardPrograms[route];
      
      if (!currentGroup || currentGroup.program !== program || currentGroup.endSegment !== startSegment) {
        // Start new group
        if (currentGroup) {
          segmentGroups.push(currentGroup);
        }
        currentGroup = {
          routes: [route],
          program,
          startSegment,
          endSegment
        };
      } else {
        // Extend current group
        currentGroup.routes.push(route);
        currentGroup.endSegment = endSegment;
      }
    });
    
    // Add the last group
    if (currentGroup) {
      segmentGroups.push(currentGroup);
    }
    
    console.log('Segment groups for merging:', segmentGroups);
    
    // Try merged searches first for groups with multiple segments
    for (const group of segmentGroups) {
      if (group.routes.length > 1) {
        console.log(`Trying merged search for ${group.startSegment}-${group.endSegment} with program ${group.program}`);
        
        try {
          // Calculate departure date for the first segment
          const firstSegmentIndex = segments.findIndex(segment => segment === group.startSegment);
          const firstFlight = cardFlights[firstSegmentIndex];
          
          let departDate = baseDate.toISOString().split('T')[0];
          if (firstFlight) {
            const departsAt = new Date(firstFlight.DepartsAt);
            const dayDiff = Math.floor((departsAt.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
            const segmentDate = new Date(baseDate);
            segmentDate.setDate(baseDate.getDate() + dayDiff);
            departDate = segmentDate.toISOString().split('T')[0];
          }
          
          // Check cache first for merged search
          const mergeCacheKey = generateCacheKey(group.program, group.startSegment, group.endSegment, departDate, seats);
          let mergeData = getCachedResult(mergeCacheKey);
          
          if (!mergeData) {
            // Try merged search if not in cache
            console.log(`Cache miss for merged search, making API call: ${mergeCacheKey}`);
            const mergeResponse = await fetch(`https://api.bbairtools.com/api/live-search-${group.program.toLowerCase()}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                from: group.startSegment, 
                to: group.endSegment, 
                depart: departDate, 
                ADT: seats 
              }),
            });
            
            if (mergeResponse.ok) {
              mergeData = await mergeResponse.json();
              // Cache the successful result
              cacheResult(mergeCacheKey, mergeData);
            }
          }
          
          if (mergeData) {
            console.log(`Merged search result for ${group.startSegment}-${group.endSegment}:`, mergeData);
            
            // Check if merged result contains all required flight numbers
            const requiredFlightNumbers = group.routes.map(route => {
              const [start, end] = route.split('-');
              const startIndex = segments.findIndex(segment => segment === start);
              return cardFlights[startIndex]?.FlightNumbers;
            }).filter(Boolean);
            
            const hasAllFlights = mergeData.itinerary?.some((itinerary: any) => {
              const itineraryFlightNumbers = itinerary.segments?.map((segment: any) => segment.flightnumber) || [];
              return requiredFlightNumbers.every(required => 
                itineraryFlightNumbers.includes(required)
              );
            });
            
            if (hasAllFlights) {
              console.log(`Merged search successful for ${group.startSegment}-${group.endSegment}`);
              mergeResults[`${group.startSegment}-${group.endSegment}`] = {
                data: mergeData,
                routes: group.routes,
                program: group.program
              };
              continue; // Skip individual searches for this group
            }
          }
        } catch (error) {
          console.error(`Merged search error for ${group.startSegment}-${group.endSegment}:`, error);
        }
      }
    }
    
    // Fall back to individual segment searches for segments not covered by merges
    const segmentsToSearchIndividually = selectedSegments.filter(route => {
      // Check if this route is covered by any successful merge
      return !Object.values(mergeResults).some(mergeResult => 
        mergeResult.routes.includes(route)
      );
    });
    
    console.log('Segments to search individually:', segmentsToSearchIndividually);
    
    // Create an array of promises for parallel API calls for individual segments
    const apiCalls = segmentsToSearchIndividually.map(async (route) => {
      const [startSegment, endSegment] = route.split('-');
      
      // Calculate departure date for this segment
      const segmentIndex = segments.findIndex(segment => segment === startSegment);
      const segmentFlight = cardFlights[segmentIndex];
      
      let departDate = baseDate.toISOString().split('T')[0];
      if (segmentFlight) {
        const departsAt = new Date(segmentFlight.DepartsAt);
        const dayDiff = Math.floor((departsAt.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
        const segmentDate = new Date(baseDate);
        segmentDate.setDate(baseDate.getDate() + dayDiff);
        departDate = segmentDate.toISOString().split('T')[0];
      }
      
      const program = cardPrograms[route];
      
      // Check cache first
      const cacheKey = generateCacheKey(program, startSegment, endSegment, departDate, seats);
      let data = getCachedResult(cacheKey);
      
      if (!data) {
        // Make API call if not in cache
        console.log(`Cache miss for individual search, making API call: ${cacheKey}`);
        try {
          const response = await fetch(`https://api.bbairtools.com/api/live-search-${program.toLowerCase()}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              from: startSegment, 
              to: endSegment, 
              depart: departDate, 
              ADT: seats 
            }),
          });
          
          if (response.ok) {
            data = await response.json();
            // Cache the successful result
            cacheResult(cacheKey, data);
          }
        } catch (error) {
          console.error(`API call error for ${route}:`, error);
        }
      }
      
      return { route, data, program };
    });
    
    try {
      const results = await Promise.all(apiCalls);
      
      // Process individual results
      results.forEach(({ route, data, program }) => {
        if (data) {
          individualResults[route] = {
            data,
            routes: [route],
            program
          };
        }
      });
      
      // Combine merge and individual results
      const allResults = { ...mergeResults, ...individualResults };
      
      // Update live search results for this card
      setLiveSearchResults(prev => ({
        ...prev,
        [cardKey]: allResults
      }));
      
      console.log('All verification results:', allResults);
      
    } catch (error) {
      console.error('Error during verification:', error);
    } finally {
      // Clear loading state for this card
      setVerifyingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardKey);
        return newSet;
      });
    }
  };

  return {
    verifyingCards,
    liveSearchResults,
    handleVerifyClick
  };
}