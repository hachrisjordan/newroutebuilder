'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface DelayAnalysisProps {
  registrationData: any[];
}

export function DelayAnalysis({ registrationData }: DelayAnalysisProps) {
  const delayStats = useMemo(() => {
    if (!registrationData || registrationData.length === 0) return null;

    const delays = {
      onTime: 0,
      delayed15: 0,
      delayed30: 0,
      delayed60: 0,
      delayed120: 0,
      veryDelayed: 0,
      canceled: 0
    };

    registrationData.forEach(flight => {
      if (flight.ontime === 'Canceled') {
        delays.canceled++;
      } else {
        const delay = parseInt(flight.ontime) || 0;
        if (delay <= 15) delays.onTime++;
        else if (delay <= 30) delays.delayed15++;
        else if (delay <= 60) delays.delayed30++;
        else if (delay <= 120) delays.delayed60++;
        else if (delay <= 240) delays.delayed120++;
        else delays.veryDelayed++;
      }
    });

    const total = registrationData.length;
    return {
      onTime: { count: delays.onTime, percentage: (delays.onTime / total * 100).toFixed(1) },
      delayed15: { count: delays.delayed15, percentage: (delays.delayed15 / total * 100).toFixed(1) },
      delayed30: { count: delays.delayed30, percentage: (delays.delayed30 / total * 100).toFixed(1) },
      delayed60: { count: delays.delayed60, percentage: (delays.delayed60 / total * 100).toFixed(1) },
      delayed120: { count: delays.delayed120, percentage: (delays.delayed120 / total * 100).toFixed(1) },
      veryDelayed: { count: delays.veryDelayed, percentage: (delays.veryDelayed / total * 100).toFixed(1) },
      canceled: { count: delays.canceled, percentage: (delays.canceled / total * 100).toFixed(1) },
      total
    };
  }, [registrationData]);

  if (!delayStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delay Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No delay data available</p>
        </CardContent>
      </Card>
    );
  }

  const categories = [
    { label: 'On Time (≤15 min)', data: delayStats.onTime, color: 'bg-green-500' },
    { label: 'Slight Delay (16-30 min)', data: delayStats.delayed15, color: 'bg-yellow-500' },
    { label: 'Moderate Delay (31-60 min)', data: delayStats.delayed30, color: 'bg-orange-500' },
    { label: 'Significant Delay (61-120 min)', data: delayStats.delayed60, color: 'bg-red-500' },
    { label: 'Major Delay (121-240 min)', data: delayStats.delayed120, color: 'bg-red-700' },
    { label: 'Very Delayed (>240 min)', data: delayStats.veryDelayed, color: 'bg-red-900' },
    { label: 'Canceled', data: delayStats.canceled, color: 'bg-gray-500' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flight Delay Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total flights analyzed: {delayStats.total}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{category.label}</span>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{category.data.count}</Badge>
                <span className="text-sm text-muted-foreground">
                  {category.data.percentage}%
                </span>
              </div>
            </div>
            <Progress 
              value={parseFloat(category.data.percentage)} 
              className="h-2"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}