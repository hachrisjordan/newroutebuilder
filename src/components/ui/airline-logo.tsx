'use client';

import Image from 'next/image';
import { useState, useCallback, memo } from 'react';
import { useTheme } from 'next-themes';
import { getAirlineLogoSrc } from '@/lib/utils';

interface AirlineLogoProps {
  code: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  onError?: () => void;
  fallbackToCode?: boolean;
}

const AirlineLogoComponent = ({
  code,
  alt,
  width = 24,
  height = 24,
  className = '',
  priority = false,
  onError,
  fallbackToCode = true
}: AirlineLogoProps) => {
  const { resolvedTheme } = useTheme();
  const [hasError, setHasError] = useState(false);
  const isDark = resolvedTheme === 'dark';
  const logoSrc = getAirlineLogoSrc(code, isDark);
  
  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);
  
  if (hasError && fallbackToCode) {
    return (
      <div 
        className={`bg-muted border rounded flex items-center justify-center text-xs font-bold text-muted-foreground ${className}`}
        style={{ width, height, minWidth: width, minHeight: height }}
      >
        {code}
      </div>
    );
  }
  
  if (hasError && !fallbackToCode) {
    return null;
  }
  
  return (
    <Image
      src={logoSrc}
      alt={alt || `${code} airline logo`}
      width={width}
      height={height}
      className={`object-contain rounded ${className}`}
      priority={priority}
      onError={handleError}
      sizes={`${width}px`}
      unoptimized={false} // Use Next.js optimization
    />
  );
};

// Memoize to prevent unnecessary re-renders
export const AirlineLogo = memo(AirlineLogoComponent);