import React from 'react';
import { classBarColors } from '../utils/award-finder-utils';

interface ClassBarProps {
  label: string;
  percent: number;
}

export const ClassBar: React.FC<ClassBarProps> = ({ label, percent }) => (
  <div className="flex items-center min-w-[60px] gap-1">
    <div className="relative w-16 h-3">
      <div className={`absolute left-0 top-0 h-3 rounded-full transition-all duration-200 w-full bg-muted`} />
      <div
        className={`absolute left-0 top-0 h-3 rounded-full transition-all duration-200 ${classBarColors[label]}`}
        style={{ width: `${percent}%` }}
      />
      <span
        className={`absolute left-1 top-0 text-[10px] font-bold select-none ${percent === 0 ? 'text-black dark:text-white' : 'text-gray-700 dark:text-black'}`}
        style={{ lineHeight: '0.75rem' }}
      >
        {label}
      </span>
    </div>
    <span className="text-xs font-mono w-7 text-right">{percent}%</span>
  </div>
);