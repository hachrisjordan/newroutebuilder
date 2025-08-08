import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import airlines from '../../airlines_full';
import { parseSearchInput, resolveVariant, isValidRegistration } from '../lib/seat-viewer-utils';
import { ALLOWED_AIRLINES } from '../lib/seat-viewer-constants';
import { AirlineOption, VariantStats } from '../types/seat-viewer';
import { useSeatData } from '../hooks/useSeatData';
import { useFlightData } from '../hooks/useFlightData';
import RegistrationCalendar from './seat-type-viewer/RegistrationCalendar';
import VariantAnalysis from './seat-type-viewer/VariantAnalysis';
import DelayAnalysis from './seat-type-viewer/DelayAnalysis';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const SeatTypeViewer: React.FC = () => {
  const [selectedAirline, setSelectedAirline] = useState<string | null>(null);
  const [flightNumber, setFlightNumber] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [availableVariants, setAvailableVariants] = useState<VariantStats[]>([]);
  
  // Advanced search state
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);
  const [arrival, setArrival] = useState<string | null>(null);

  // Use custom hooks
  const { seatData, loading: seatDataLoading } = useSeatData(selectedAirline);
  const { registrationData, loading, dataFetched, fetchFlightData } = useFlightData();

  // Filter and sort allowed airlines
  const sortedAirlines: AirlineOption[] = airlines
    .filter(airline => ALLOWED_AIRLINES.includes(airline.value))
    .sort((a, b) => a.label.localeCompare(b.label));

  const handleSearch = async () => {
    try {
      await fetchFlightData(selectedAirline!, flightNumber, origin, arrival);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  // Extract unique variants for filter options
  useEffect(() => {
    if (dataFetched && seatData && registrationData.length > 0) {
      console.log('Seat data:', seatData);
      const variants = new Set<string>();
      const variantInfo = new Map<string, { aircraftType: string; note: string; color: string }>();
      
      // Only collect variants that appear in the registration data
      registrationData.forEach(item => {
        if (!isValidRegistration(item.registration, selectedAirline!)) return;
        
        const variant = resolveVariant(seatData.tail_number_distribution[item.registration], item.date);
        
        if (variant) {
          variants.add(variant);
          
          // Get aircraft type and note for this variant
          if (!variantInfo.has(variant)) {
            const configsByType = seatData.configs_by_type || seatData.configurations_by_type;
            for (const [aircraftType, configs] of Object.entries(configsByType || {})) {
              const config = (configs as any[]).find(c => c.variant === variant);
              if (config) {
                variantInfo.set(variant, {
                  aircraftType,
                  note: config.note,
                  color: config.color
                });
                break;
              }
            }
          }
        }
      });
      
      // Convert to array format expected by the filter modal
      const variantList: VariantStats[] = Array.from(variants).map(variant => {
        const info = variantInfo.get(variant);
        return {
          variant,
          count: 0, // We don't need count for the filter
          percentage: 0,
          aircraftType: info?.aircraftType || '',
          note: info?.note || '',
          color: info?.color || '#000'
        };
      });
      
      setAvailableVariants(variantList);
    }
  }, [dataFetched, seatData, registrationData, selectedAirline]);

  // Function to get filtered registration data based on selected variants
  const getFilteredRegistrationData = () => {
    if (!selectedVariants.length || !seatData) {
      return registrationData;
    }
    
    return registrationData.filter(item => {
      if (!isValidRegistration(item.registration, selectedAirline!)) return true;
      
      const variant = resolveVariant(seatData.tail_number_distribution[item.registration], item.date);
      
      return variant ? selectedVariants.includes(variant) : false;
    });
  };

  // For now, we'll disable advanced search functionality
  // This can be re-enabled once the airport data import is properly configured

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      {/* Search Form */}
      <div style={{ 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        padding: '24px',
        marginBottom: '20px',
        backgroundColor: 'white',
        border: '1px solid #f0f0f0'
      }}>
        <div className="mb-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <Label htmlFor="airline-select" className="font-medium mb-1">Airline</Label>
              <Select
                value={selectedAirline || ''}
                onValueChange={setSelectedAirline}
                disabled={seatDataLoading}
              >
                <SelectTrigger className="w-60" id="airline-select">
                  <SelectValue placeholder="Select an airline" />
                </SelectTrigger>
                <SelectContent>
                  {sortedAirlines.map(airline => (
                    <SelectItem key={airline.value} value={airline.value}>
                      <div className="flex items-center">
                        {airline.flag && (
                          <span className={`flag-icon flag-icon-${airline.flag.toLowerCase()} mr-2`} />
                        )}
                        {airline.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="flight-number-input" className="font-medium mb-1">Flight Number</Label>
              <Input
                id="flight-number-input"
                className="w-32"
                placeholder="e.g. 123"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={loading || !selectedAirline || !flightNumber}
              >
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              >
                {isAdvancedOpen ? 'Hide' : 'Show'} Advanced Search
              </Button>
            </div>
          </div>
        </div>
        
                 {/* Advanced Search - Temporarily disabled */}
         {isAdvancedOpen && (
           <div style={{ 
             borderTop: '1px solid #f0f0f0', 
             paddingTop: '16px',
             color: '#666',
             fontStyle: 'italic'
           }}>
             Advanced search (origin/destination filtering) will be available in a future update.
           </div>
         )}
      </div>
      
      {/* Results */}
      {dataFetched && (
        <div className="rounded-lg shadow-lg mt-5 p-6 w-fit overflow-visible bg-white border border-gray-200">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={() => setFilterModalVisible(true)}
              disabled={availableVariants.length === 0}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filter Variants
            </Button>
          </div>

          <RegistrationCalendar
            registrationData={getFilteredRegistrationData()}
            airline={selectedAirline!}
            flightNumber={flightNumber}
            seatData={seatData}
          />
        </div>
      )}

      {/* Analysis Components */}
      {dataFetched && seatData && (
        <>
          <VariantAnalysis
            registrationData={registrationData}
            airline={selectedAirline!}
            seatData={seatData}
          />
          <DelayAnalysis
            registrationData={registrationData}
          />
        </>
      )}

      {/* Filter Modal */}
      <Dialog open={filterModalVisible} onOpenChange={setFilterModalVisible}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Filter Aircraft Variants</DialogTitle>
          </DialogHeader>
          <div className="w-full">
            {availableVariants.map((variant, index) => (
              <div key={variant.variant} className="mb-2 flex items-center">
                <Checkbox
                  id={`variant-${index}`}
                  checked={selectedVariants.includes(variant.variant)}
                  onCheckedChange={(checked) => {
                    const newSelectedVariants = checked
                      ? [...selectedVariants, variant.variant]
                      : selectedVariants.filter(v => v !== variant.variant);
                    setSelectedVariants(newSelectedVariants);
                  }}
                  className="mr-2"
                />
                <Label htmlFor={`variant-${index}`} className="flex-grow">
                  <span className="font-bold">
                    {variant.aircraftType} ({variant.variant})
                  </span>
                  <span className="italic ml-2">- {variant.note}</span>
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            {selectedVariants.length > 0 && (
              <Button
                variant="link"
                onClick={() => setSelectedVariants([])}
              >
                Clear All
              </Button>
            )}
            <Button onClick={() => setFilterModalVisible(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeatTypeViewer;