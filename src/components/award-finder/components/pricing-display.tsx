import React from 'react';

interface PricingDisplayProps {
  pricing: any[];
}

export const PricingDisplay: React.FC<PricingDisplayProps> = ({ pricing }) => {
  if (!pricing) return null;

  const classBarColors: Record<string, string> = {
    Y: '#E8E1F2', // lavender
    W: '#B8A4CC', // purple
    J: '#F3CD87', // gold
    F: '#D88A3F', // orange
  };

  return (
    <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
      {pricing
        .slice()
        .sort((a: any, b: any) => {
          const order = ['Y', 'W', 'J', 'F'];
          return order.indexOf(a.class) - order.indexOf(b.class);
        })
        .map((bundle: any) => {
          const bg = classBarColors[bundle.class] || '#E8E1F2';
          
          return (
            <div key={bundle.class} className="flex flex-col items-center">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-bold"
                style={{ background: bg, color: '#222' }}
              >
                <span className="mr-1">{bundle.class}:</span>
                <span className="tabular-nums">{Number(bundle.points).toLocaleString()}</span>
                <span className="ml-1 text-xs font-normal opacity-80">
                  +{Number(bundle.fareTax).toFixed(2)}
                </span>
              </span>
              <div
                className="w-full h-1 rounded-full mt-0.5"
                style={{ background: bg }}
              />
            </div>
          );
        })}
    </div>
  );
};