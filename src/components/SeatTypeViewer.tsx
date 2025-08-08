import React, { useState, useEffect, useMemo } from 'react';
import { Select, Input, Button, Space, Modal, Checkbox } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import airlines from '../../airlines_full';
import { parseSearchInput, resolveVariant, isValidRegistration } from '../lib/seat-viewer-utils';
import { ALLOWED_AIRLINES } from '../lib/seat-viewer-constants';
import { AirlineOption, VariantStats } from '../types/seat-viewer';
import { useSeatData } from '../hooks/useSeatData';
import { useFlightData } from '../hooks/useFlightData';
import RegistrationCalendar from './seat-type-viewer/RegistrationCalendar';
import VariantAnalysis from './seat-type-viewer/VariantAnalysis';
import DelayAnalysis from './seat-type-viewer/DelayAnalysis';

const { Option } = Select;

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
        <div style={{ marginBottom: '16px' }}>
          <Space wrap size={16}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Airline</div>
              <Select
                showSearch
                style={{ width: 240 }}
                placeholder="Select an airline"
                value={selectedAirline}
                onChange={setSelectedAirline}
                loading={seatDataLoading}
                optionFilterProp="label"
                filterOption={(input, option) => {
                  if (!option) return false;
                  const searchTerm = parseSearchInput(input);
                  if (!searchTerm) return true;
                  
                  const label = String(option.label || '').toLowerCase();
                  const value = String(option.value || '').toLowerCase();
                  
                  return label.includes(searchTerm) || value.includes(searchTerm);
                }}
              >
                {sortedAirlines.map(airline => (
                  <Option key={airline.value} value={airline.value} label={airline.label}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {airline.flag && (
                        <span className={`flag-icon flag-icon-${airline.flag.toLowerCase()}`} style={{ marginRight: 8 }} />
                      )}
                      {airline.label}
                    </div>
                  </Option>
                ))}
              </Select>
            </div>
            
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Flight Number</div>
              <Input
                style={{ width: 120 }}
                placeholder="e.g. 123"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                onPressEnter={handleSearch}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <Button
                type="primary"
                onClick={handleSearch}
                loading={loading}
                disabled={!selectedAirline || !flightNumber}
                style={{ backgroundColor: '#000000' }}
              >
                Search
              </Button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <Button
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                style={{ color: '#666' }}
              >
                {isAdvancedOpen ? 'Hide' : 'Show'} Advanced Search
              </Button>
            </div>
          </Space>
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
        <div 
          style={{ 
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            marginTop: '20px',
            padding: '24px',
            width: 'fit-content',
            overflow: 'visible',
            backgroundColor: 'white',
            border: '1px solid #f0f0f0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setFilterModalVisible(true)}
              disabled={availableVariants.length === 0}
            >
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
      <Modal
        title="Filter Aircraft Variants"
        open={filterModalVisible}
        onOk={() => setFilterModalVisible(false)}
        onCancel={() => setFilterModalVisible(false)}
        width={600}
      >
        <div style={{ width: '100%' }}>
          {availableVariants.map(variant => (
            <div key={variant.variant} style={{ marginBottom: 8 }}>
              <Checkbox
                checked={selectedVariants.includes(variant.variant)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedVariants([...selectedVariants, variant.variant]);
                  } else {
                    setSelectedVariants(selectedVariants.filter(v => v !== variant.variant));
                  }
                }}
                style={{ marginRight: 8 }}
              >
                <span style={{ fontWeight: 'bold' }}>
                  {variant.aircraftType} ({variant.variant})
                </span>
                <span style={{ fontStyle: 'italic', marginLeft: '10px' }}>- {variant.note}</span>
              </Checkbox>
            </div>
          ))}
        </div>
        
        {selectedVariants.length > 0 && (
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <Button 
              type="link" 
              onClick={() => setSelectedVariants([])}
            >
              Clear All
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SeatTypeViewer;