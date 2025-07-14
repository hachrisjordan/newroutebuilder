'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VariantAnalysisProps {
  registrationData: any[];
  airline: string;
  seatData: any;
}

export function VariantAnalysis({ registrationData, airline, seatData }: VariantAnalysisProps) {
  const variantStats = useMemo(() => {
    if (!registrationData || !seatData) return null;

    const variants = new Map();
    
    registrationData.forEach(flight => {
      if (flight.registration && flight.registration !== 'None') {
        const variant = getAircraftVariant(flight.registration, seatData, flight.date);
        if (variant) {
          if (!variants.has(variant)) {
            variants.set(variant, {
              count: 0,
              registrations: new Set(),
              flights: []
            });
          }
          const variantData = variants.get(variant);
          variantData.count++;
          variantData.registrations.add(flight.registration);
          variantData.flights.push(flight);
        }
      }
    });

    return Array.from(variants.entries()).map(([variant, data]) => ({
      variant,
      count: data.count,
      registrationCount: data.registrations.size,
      percentage: (data.count / registrationData.length * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);
  }, [registrationData, seatData]);

  function getAircraftVariant(registration: string, seatData: any, date: string) {
    if (!registration || registration === 'None' || !seatData) {
      return null;
    }
    
    let variant = seatData.tail_number_distribution[registration];
    
    if (variant && typeof variant === 'object' && variant.changes) {
      const sortedChanges = [...variant.changes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const applicableChange = sortedChanges.find(change => new Date(date) >= new Date(change.date));
      variant = applicableChange ? applicableChange.variant : variant.default;
    }
    
    if (variant && typeof variant === 'object' && variant.default) {
      variant = variant.default;
    }
    
    return variant;
  }

  if (!variantStats || variantStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aircraft Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No variant data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aircraft Variants Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {variantStats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Badge variant="secondary">{stat.variant}</Badge>
              <div>
                <p className="font-medium">{stat.count} flights</p>
                <p className="text-sm text-muted-foreground">
                  {stat.registrationCount} aircraft
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium">{stat.percentage}%</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}