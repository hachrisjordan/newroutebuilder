import React, { useState, useEffect, useMemo } from 'react';
import { Button, Typography } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { resolveVariant, isValidRegistration } from '../../lib/seat-viewer-utils';
import { TIME_PERIODS } from '../../lib/seat-viewer-constants';
import { VariantAnalysisProps, VariantStats, TimeAnalysis } from '../../types/seat-viewer';
import SeatMapTooltip from './SeatMapTooltip';

const { Title, Text } = Typography;

const VariantAnalysis: React.FC<VariantAnalysisProps> = ({ 
  registrationData, 
  airline, 
  seatData 
}) => {
  // Available variants with count information
  const variantStats = useMemo(() => {
    if (!registrationData || !airline || !seatData) {
      return [];
    }

    const variantCounts = new Map();
    const variantInfo = new Map();
    const validData = registrationData.filter(item => isValidRegistration(item.registration, airline));
    
    // Count each variant appearance
    validData.forEach(item => {
      const variant = resolveVariant(seatData.tail_number_distribution[item.registration], item.date);
      
      if (variant) {
        variantCounts.set(variant, (variantCounts.get(variant) || 0) + 1);
        
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
    
    // Convert to array and sort by count (most frequent first)
    const stats: VariantStats[] = Array.from(variantCounts.entries()).map(([variant, count]) => ({
      variant,
      count,
      percentage: (count / validData.length) * 100,
      aircraftType: variantInfo.get(variant)?.aircraftType || '',
      note: variantInfo.get(variant)?.note || '',
      color: variantInfo.get(variant)?.color || '#000'
    }));
    
    return stats.sort((a, b) => b.count - a.count);
  }, [registrationData, airline, seatData]);
  
  // Default to the most frequent variant
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  
  // Set the most frequent variant as default when data changes
  useEffect(() => {
    if (variantStats.length > 0 && !selectedVariant) {
      setSelectedVariant(variantStats[0].variant);
    }
  }, [variantStats, selectedVariant]);
  
  // Calculate time-based percentages
  const timeAnalysis = useMemo(() => {
    if (!selectedVariant || !registrationData || !seatData) return [];
    
    const now = new Date();
    
    return TIME_PERIODS.map((period) => {
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - period.days);
      
      // First filter by date range and valid registration
      const allFlightsInPeriod = registrationData.filter(item => {
        if (!isValidRegistration(item.registration, airline)) return false;
        
        const [year, month, day] = item.date.split('-').map(Number);
        const itemDate = new Date(year, month - 1, day);
        return itemDate >= cutoffDate && itemDate <= now;
      });
      
      // Then count ones matching the selected variant
      const variantCount = allFlightsInPeriod.filter(item => {
        const variant = resolveVariant(seatData.tail_number_distribution[item.registration], item.date);
        return variant === selectedVariant;
      }).length;
      
      const totalCount = allFlightsInPeriod.length;
      
      return {
        label: period.label,
        percentage: totalCount === 0 ? 0 : (variantCount / totalCount) * 100,
        flights: variantCount,
        totalFlights: totalCount
      };
    });
  }, [selectedVariant, registrationData, seatData, airline]);

  const selectedVariantInfo = variantStats.find(v => v.variant === selectedVariant);

  if (!variantStats.length) {
    return null;
  }

  return (
    <div style={{
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      marginTop: '20px',
      padding: '24px',
      backgroundColor: 'white',
      border: '1px solid #f0f0f0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <BarChartOutlined style={{ fontSize: '24px', marginRight: '8px' }} />
        <Title level={3} style={{ margin: 0 }}>Variant Analysis</Title>
      </div>
      
      {/* Variant selector */}
      <div style={{ marginBottom: '20px' }}>
        <Text strong style={{ marginBottom: '8px', display: 'block' }}>Select Variant to Analyze:</Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {variantStats.map(variant => (
            <Button
              key={variant.variant}
              type={selectedVariant === variant.variant ? 'primary' : 'default'}
              onClick={() => setSelectedVariant(variant.variant)}
              style={{
                backgroundColor: selectedVariant === variant.variant ? variant.color : undefined,
                borderColor: variant.color,
                color: selectedVariant === variant.variant ? 'white' : variant.color
              }}
            >
              {variant.aircraftType} ({variant.variant}) - {variant.count} flights ({variant.percentage.toFixed(1)}%)
            </Button>
          ))}
        </div>
      </div>

      {/* Selected variant details */}
      {selectedVariantInfo && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <Text strong style={{ fontSize: '16px' }}>
            <SeatMapTooltip 
              airline={airline} 
              variant={selectedVariant!} 
              aircraftType={selectedVariantInfo.aircraftType}
            >
              {selectedVariantInfo.aircraftType} ({selectedVariant})
            </SeatMapTooltip>
          </Text>
          <div style={{ marginTop: '8px', color: '#666' }}>
            {selectedVariantInfo.note}
          </div>
          <div style={{ marginTop: '8px' }}>
            <Text>Total flights: {selectedVariantInfo.count} ({selectedVariantInfo.percentage.toFixed(1)}% of all flights)</Text>
          </div>
        </div>
      )}

      {/* Time-based analysis */}
      <div>
        <Text strong style={{ marginBottom: '12px', display: 'block' }}>
          Frequency Over Time for {selectedVariantInfo?.aircraftType} ({selectedVariant}):
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {timeAnalysis.map((period, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              backgroundColor: '#fafafa',
              borderRadius: '4px',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ minWidth: '120px', fontWeight: 'bold' }}>
                {period.label}:
              </div>
              <div style={{
                flex: 1,
                height: '20px',
                backgroundColor: '#e0e0e0',
                borderRadius: '10px',
                margin: '0 12px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  backgroundColor: selectedVariantInfo?.color || '#1890ff',
                  borderRadius: '10px',
                  width: `${period.percentage}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ minWidth: '200px', textAlign: 'right', fontSize: '14px' }}>
                {period.percentage.toFixed(1)}% ({period.flights}/{period.totalFlights} flights)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VariantAnalysis;