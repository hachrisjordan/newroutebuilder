import React, { useState } from 'react';
import { Button, Typography, Tooltip } from 'antd';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { 
  getAircraftDetails, 
  getOntimeStatus, 
  isValidRegistration 
} from '../../lib/seat-viewer-utils';
import { 
  MONTH_NAMES, 
  DAY_NAMES, 
  CALENDAR_CELL_WIDTH, 
  CALENDAR_CELL_MIN_HEIGHT 
} from '../../lib/seat-viewer-constants';
import { RegistrationCalendarProps, RegistrationDataItem } from '../../types/seat-viewer';

// Configure dayjs with UTC plugin
dayjs.extend(utc);

const { Title } = Typography;

const RegistrationCalendar: React.FC<RegistrationCalendarProps> = ({ 
  registrationData = [], 
  airline, 
  flightNumber, 
  seatData 
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs().utc());
  
  const goToPrevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  const year = currentDate.year();
  const month = currentDate.month();
  const monthName = MONTH_NAMES[month];
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  
  // Create a map of dates to registration numbers and ontime data
  const registrationByDate: { [date: string]: RegistrationDataItem } = {};
  registrationData.forEach(item => {
    // If we already have data for this date, only update if current registration is valid and previous was N/A
    if (registrationByDate[item.date]) {
      if (item.registration !== 'N/A' && registrationByDate[item.date].registration === 'N/A') {
        registrationByDate[item.date] = {
          registration: item.registration,
          ontime: item.ontime,
          date: item.date
        };
      }
    } else {
      // First entry for this date
      registrationByDate[item.date] = {
        registration: item.registration,
        ontime: item.ontime,
        date: item.date
      };
    }
  });

  return (
    <div style={{ width: 'fit-content' }}>
      {/* Month navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <Button 
          type="primary"
          onClick={goToPrevMonth}
          style={{ backgroundColor: '#000000' }}
        >
          &larr;
        </Button>
        <Title level={4} style={{ margin: 0 }}>{monthName} {year}</Title>
        <Button 
          type="primary"
          onClick={goToNextMonth}
          style={{ backgroundColor: '#000000' }}
        >
          &rarr;
        </Button>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(7, ${CALENDAR_CELL_WIDTH}px)`,
        gap: '1px',
        backgroundColor: '#f0f0f0',
        width: 'fit-content',
        border: '1px solid #f0f0f0'
      }}>
        {/* Day headers */}
        {DAY_NAMES.map(day => (
          <div key={day} style={{
            backgroundColor: '#f5f5f5',
            padding: '8px',
            textAlign: 'center',
            fontWeight: 'bold',
            width: `${CALENDAR_CELL_WIDTH}px`
          }}>
            {day}
          </div>
        ))}
        
        {/* Empty cells for days before the first of the month */}
        {Array.from({ length: firstDayOfMonth }, (_, i) => (
          <div key={`empty-${i}`} style={{
            backgroundColor: '#f5f5f5',
            padding: '8px',
            width: `${CALENDAR_CELL_WIDTH}px`,
            minHeight: `${CALENDAR_CELL_MIN_HEIGHT}px`
          }} />
        ))}
        
        {/* Days of the month */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(Date.UTC(year, month, day));
          const dateStr = date.toISOString().split('T')[0];
          const dayData = registrationByDate[dateStr];
          const registration = dayData?.registration;
          const ontime = dayData?.ontime;
          const aircraftDetails = registration && registration !== 'N/A' ? getAircraftDetails(registration, airline, seatData, dateStr) : null;
          const status = getOntimeStatus(ontime, dateStr);
          
          return (
            <div key={i} style={{
              backgroundColor: 'white',
              padding: '8px',
              minHeight: `${CALENDAR_CELL_MIN_HEIGHT}px`,
              width: `${CALENDAR_CELL_WIDTH}px`,
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{ 
                marginBottom: '16px',
                fontWeight: 'bold',
                paddingBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                fontSize: '14px'
              }}>
                {/* Status group */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  position: 'absolute',
                  left: 0,
                  fontSize: '12px'
                }}>
                  {status && (
                    <>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: status.color,
                        border: '1px solid #ddd',
                        flexShrink: 0
                      }} />
                      <span style={{
                        fontSize: '12px',
                        color: status.color,
                        whiteSpace: 'nowrap',
                        fontWeight: 'bold'
                      }}>
                        {status.text}
                      </span>
                    </>
                  )}
                </div>
                {/* Date number - always on the right */}
                <span style={{
                  position: 'absolute',
                  right: 0,
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {day}
                </span>
              </div>
              
              {/* Registration and Aircraft info */}
              {registration && registration !== 'N/A' && (
                <>
                  <div style={{ 
                    fontSize: '13px',
                    fontWeight: 'bold',
                    textAlign: 'left',
                    marginBottom: '4px'
                  }}>
                    {registration}
                  </div>
                  
                  {aircraftDetails && (
                    <div style={{
                      backgroundColor: aircraftDetails.color || '#f0f0f0',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      textAlign: 'left',
                      marginBottom: '4px',
                      lineHeight: '1.2'
                    }}>
                      <div>{aircraftDetails.aircraftType}</div>
                      <div style={{ fontSize: '10px', opacity: 0.9 }}>
                        {aircraftDetails.note}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Show "No registration" for N/A or missing data */}
              {(!registration || registration === 'N/A') && (
                <div style={{
                  fontSize: '11px',
                  color: '#999',
                  textAlign: 'left',
                  fontStyle: 'italic'
                }}>
                  No registration
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RegistrationCalendar;