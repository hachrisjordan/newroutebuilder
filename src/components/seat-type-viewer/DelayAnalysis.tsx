import React, { useMemo } from 'react';
import { Typography } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { TIME_PERIODS } from '../../lib/seat-viewer-constants';
import { DelayAnalysisProps } from '../../types/seat-viewer';

const { Title, Text } = Typography;

interface DelayCategory {
  'Canceled': number;
  'Diverted': number;
  'On Time': number;
  '0-15 min': number;
  '15-30 min': number;
  '30-60 min': number;
  '1-2 hours': number;
  '2+ hours': number;
}

interface DelayPeriodStats {
  label: string;
  onTimePercentage: number;
  averageDelay: string;
  rawAverageDelay: number;
  totalFlights: number;
  onTimeFlights: number;
  delayDistribution: DelayCategory;
  canceledPercentage: number;
}

const DelayAnalysis: React.FC<DelayAnalysisProps> = ({ registrationData }) => {
  // Helper function to get color based on delay
  const getDelayColor = (delay: number, canceledPercentage = 0): string => {
    if (canceledPercentage >= 50) return '#000000'; // Black for majority canceled
    if (delay <= 0) return '#4caf50'; // Green
    if (delay >= 120) return '#f44336'; // Red
    
    // Linear interpolation between colors
    if (delay <= 30) {
      // Green to Yellow
      const r = Math.round(76 + (255 - 76) * (delay / 30));
      const g = Math.round(175 + (193 - 175) * (delay / 30));
      const b = Math.round(80 + (7 - 80) * (delay / 30));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Yellow to Red
      const r = Math.round(255 + (244 - 255) * ((delay - 30) / 90));
      const g = Math.round(193 + (67 - 193) * ((delay - 30) / 90));
      const b = Math.round(7 + (54 - 7) * ((delay - 30) / 90));
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Helper function to get delay category
  const getDelayCategory = (delay: string | number): keyof DelayCategory => {
    if (delay === 'CANCELED') return 'Canceled';
    if (typeof delay === 'string' && delay.startsWith('Diverted to')) return 'Diverted';
    const numericDelay = typeof delay === 'string' ? parseInt(delay) : delay;
    if (numericDelay <= 0) return 'On Time';
    if (numericDelay <= 15) return '0-15 min';
    if (numericDelay <= 30) return '15-30 min';
    if (numericDelay <= 60) return '30-60 min';
    if (numericDelay <= 120) return '1-2 hours';
    return '2+ hours';
  };

  // Calculate delay statistics
  const delayStats = useMemo(() => {
    if (!registrationData) return null;

    const now = new Date();
    
    return TIME_PERIODS.map((period) => {
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - period.days);
      
      // Filter flights in the period
      const flightsInPeriod = registrationData.filter(item => {
        const [year, month, day] = item.date.split('-').map(Number);
        const itemDate = new Date(year, month - 1, day);
        return itemDate >= cutoffDate && itemDate <= now && item.ontime !== 'N/A';
      });
      
      // Calculate statistics
      const totalFlights = flightsInPeriod.length;
      if (totalFlights === 0) return null;

      const onTimeFlights = flightsInPeriod.filter(item => parseInt(String(item.ontime)) <= 0).length;
      const onTimePercentage = (onTimeFlights / totalFlights) * 100;
      
      // Calculate average delay (including all flights)
      const totalDelay = flightsInPeriod.reduce((sum, item) => {
        const delay = parseInt(String(item.ontime));
        return isNaN(delay) ? sum : sum + delay;
      }, 0);
      const averageDelay = totalDelay / totalFlights;

      // Calculate delay distribution
      const delayCategories: DelayCategory = {
        'Canceled': 0,
        'Diverted': 0,
        'On Time': 0,
        '0-15 min': 0,
        '15-30 min': 0,
        '30-60 min': 0,
        '1-2 hours': 0,
        '2+ hours': 0
      };

      flightsInPeriod.forEach(item => {
        const category = getDelayCategory(item.ontime);
        delayCategories[category]++;
      });

      // Calculate canceled percentage
      const canceledPercentage = (delayCategories['Canceled'] / totalFlights) * 100;

      // Format average delay
      let formattedDelay: string;
      if (averageDelay >= 60) {
        const hours = Math.floor(averageDelay / 60);
        const minutes = Math.round(averageDelay % 60);
        formattedDelay = minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
      } else {
        formattedDelay = `${Math.round(averageDelay)}m`;
      }

      return {
        label: period.label,
        onTimePercentage,
        averageDelay: formattedDelay,
        rawAverageDelay: averageDelay,
        totalFlights,
        onTimeFlights,
        delayDistribution: delayCategories,
        canceledPercentage
      };
    }).filter((item): item is DelayPeriodStats => item !== null);
  }, [registrationData]);

  if (!delayStats || delayStats.length === 0) return null;

  const getCategoryColor = (category: keyof DelayCategory): string => {
    const colorMap: Record<keyof DelayCategory, string> = {
      'Canceled': '#000000',
      'Diverted': '#9c27b0',
      'On Time': '#4caf50',
      '0-15 min': '#8bc34a',
      '15-30 min': '#ffc107',
      '30-60 min': '#ff9800',
      '1-2 hours': '#ff5722',
      '2+ hours': '#f44336'
    };
    return colorMap[category] || '#9e9e9e';
  };

  const categoryOrder: (keyof DelayCategory)[] = [
    'On Time', '0-15 min', '15-30 min', '30-60 min', '1-2 hours', '2+ hours', 'Diverted', 'Canceled'
  ];

  return (
    <div style={{ marginTop: '20px', width: '100%', maxWidth: '1340px' }}>
      <div 
        style={{ 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          padding: '24px',
          backgroundColor: 'white',
          border: '1px solid #f0f0f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <BarChartOutlined style={{ marginRight: '8px', fontSize: '18px' }} />
          <Title level={5} style={{ margin: 0 }}>Delay Analysis</Title>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '8px'
        }}>
          {delayStats.map((period, index) => {
            const color = getDelayColor(period.rawAverageDelay, period.canceledPercentage);
            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div 
                  style={{
                    padding: '12px',
                    backgroundColor: 'white',
                    border: '1px solid #4caf5020',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: `${period.onTimePercentage}%`,
                    backgroundColor: '#4caf5020',
                    zIndex: 0
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <Text style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                      {period.label}
                    </Text>
                    <Text style={{ fontWeight: 'bold', fontSize: '18px', color: color }}>
                      {period.averageDelay} ({period.onTimePercentage.toFixed(1)}%)
                    </Text>
                    <Text style={{ fontSize: '11px', color: '#888', display: 'block', marginTop: '4px' }}>
                      {period.onTimeFlights} / {period.totalFlights} flights on time
                    </Text>
                  </div>
                </div>
                
                {/* Delay Distribution Bar Chart */}
                <div style={{ 
                  padding: '8px',
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '10px'
                }}>
                  {categoryOrder
                    .map(category => [category, period.delayDistribution[category]] as const)
                    .map(([category, count]) => {
                      const percentage = (count / period.totalFlights) * 100;
                      const categoryColor = getCategoryColor(category);
                      
                      return (
                        <div key={category} style={{ marginBottom: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span>{category}</span>
                            <span>{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div style={{ 
                            width: '100%', 
                            height: '4px', 
                            backgroundColor: '#f0f0f0',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${percentage}%`,
                              height: '100%',
                              backgroundColor: categoryColor,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DelayAnalysis;