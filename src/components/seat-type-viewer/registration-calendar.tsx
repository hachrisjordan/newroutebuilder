'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RegistrationCalendarProps {
  registrationData: any[];
  airline: string;
  flightNumber: string;
  seatData: any;
}

export function RegistrationCalendar({ 
  registrationData = [], 
  airline, 
  flightNumber, 
  seatData 
}: RegistrationCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showFilters, setShowFilters] = useState(false);

  // Get available months from registration data
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    
    registrationData.forEach(flight => {
      if (flight.date) {
        const date = new Date(flight.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        monthSet.add(monthKey);
      }
    });

    return Array.from(monthSet)
      .map(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        return { year, month };
      })
      .sort((a, b) => {
        // Sort by year first, then by month (reverse chronological)
        if (a.year !== b.year) {
          return b.year - a.year;
        }
        return b.month - a.month;
      });
  }, [registrationData]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleMonthSelect = (value: string) => {
    const [year, month] = value.split('-').map(Number);
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const getFlightForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return registrationData.find(flight => flight.date === dateString);
  };

  const renderCalendar = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const flight = getFlightForDate(currentDate);
      const isCurrentMonth = currentDate.getMonth() === currentMonth;
      const isToday = currentDate.getTime() === today.getTime();
      
      days.push(
        <div
          key={i}
          className={cn(
            "h-8 w-8 text-xs flex items-center justify-center border",
            isCurrentMonth ? "text-foreground" : "text-muted-foreground",
            isToday && "bg-primary text-primary-foreground",
            flight && "bg-blue-100 hover:bg-blue-200"
          )}
          title={flight ? `${flight.registration} - ${flight.ontime}` : ''}
        >
          {currentDate.getDate()}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Flight Calendar</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters {showFilters ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={goToPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Select
            value={`${currentYear}-${currentMonth}`}
            onValueChange={handleMonthSelect}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue>
                {monthNames[currentMonth]} {currentYear}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableMonths.length > 0 ? (
                availableMonths.map(({ year, month }) => (
                  <SelectItem key={`${year}-${month}`} value={`${year}-${month}`}>
                    {monthNames[month]} {year}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-data" disabled>
                  No data available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline" size="sm" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="h-8 flex items-center justify-center font-medium text-sm">
            {day}
          </div>
        ))}
        {renderCalendar()}
      </div>
    </div>
  );
}