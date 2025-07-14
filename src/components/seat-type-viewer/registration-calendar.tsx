'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <h4 className="text-md font-medium">
          {monthNames[currentMonth]} {currentYear}
        </h4>
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