'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function LoadFactorTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/load-factor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          departureAirports: ['JFK'],
          arrivalAirports: ['LAX'],
          startMonth: '2018-01',
          endMonth: '2018-12',
          airlines: ['AA', 'UA'],
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Test failed:', error);
      setResult({ error: 'Test failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Load Factor API Test</h1>
      <Button onClick={testAPI} disabled={loading}>
        {loading ? 'Testing...' : 'Test API'}
      </Button>
      
      {result && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 