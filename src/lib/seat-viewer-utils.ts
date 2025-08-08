import dayjs from 'dayjs';
import { STATUS_COLORS } from './seat-viewer-constants';

// Utility to resolve the correct variant for a registration and date
export const resolveVariant = (variantObj: any, date: string): string | null => {
  let variant = variantObj;
  if (variant && typeof variant === 'object' && 'changes' in variant && variant.changes) {
    const sortedChanges = [...variant.changes].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const applicableChange = sortedChanges.find((change: any) => new Date(date) >= new Date(change.date));
    variant = applicableChange ? applicableChange.variant : variant.default;
  }
  if (variant && typeof variant === 'object' && 'default' in variant && variant.default) {
    variant = variant.default;
  }
  return variant;
};

// Function to get aircraft details from registration number
export const getAircraftDetails = (registration: string, airline: string, seatData: any, date: string) => {
  if (!registration || registration === 'None' || !seatData) {
    return null;
  }
  
  // Get the variant configuration
  let variant = resolveVariant(seatData.tail_number_distribution[registration], date);
  
  // Find aircraft type and config information
  const configsByType = seatData.configs_by_type || seatData.configurations_by_type;
  for (const [aircraftType, configs] of Object.entries(configsByType || {})) {
    const config = (configs as any[]).find(c => c.variant === variant);
    if (config) {
      return {
        aircraftType,
        variant,
        config: config.config,
        note: config.note,
        color: config.color
      };
    }
  }
  
  return null;
};

// Helper function to get ontime status
export const getOntimeStatus = (ontime: any, date: string) => {
  if (!ontime) return null;
  
  if (ontime === 'CANCELED') {
    return {
      color: STATUS_COLORS.CANCELED,
      text: 'Canceled'
    };
  }

  // Check for diverted flights
  if (ontime.startsWith('Diverted to')) {
    return {
      color: STATUS_COLORS.DIVERTED,
      text: ontime
    };
  }

  // Check if the flight is in the future
  const flightDate = new Date(date);
  const today = new Date();
  const isFuture = flightDate > today;
  
  // Check if the flight is more than 2 days old
  const diffTime = Math.abs(today.getTime() - flightDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (ontime === 'N/A') {
    if (isFuture) {
      return null; // Don't show anything for future flights with N/A
    }
    if (diffDays > 2) {
      return {
        color: STATUS_COLORS.NO_INFO,
        text: 'No info'
      };
    }
    return null; // Don't show anything for recent N/A
  }

  const minutes = parseInt(ontime);
  if (isNaN(minutes)) return null;

  let color: string, text: string;
  
  if (minutes <= 0) {
    color = STATUS_COLORS.ON_TIME;
  } else if (minutes < 30) {
    color = STATUS_COLORS.MINOR_DELAY;
  } else {
    color = STATUS_COLORS.MAJOR_DELAY;
  }

  if (minutes === 0) {
    text = 'On time';
  } else if (minutes < 0) {
    text = `${Math.abs(minutes)}m early`;
  } else {
    // Format time for delays over 60 minutes
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      const timeStr = remainingMinutes > 0 
        ? `${hours}h${remainingMinutes}m`
        : `${hours}h`;
      text = `${timeStr} late`;
    } else {
      text = `${minutes}m late`;
    }
  }

  return { color, text };
};

// Parse search input utility
export const parseSearchInput = (inputValue: any): string => {
  if (!inputValue) return '';
  try {
    if (typeof inputValue === 'object' && inputValue !== null) {
      if (inputValue._searchText) {
        return String(inputValue._searchText).toLowerCase();
      } else if (inputValue.input) {
        return String(inputValue.input).toLowerCase();
      } else if (inputValue.searchText) {
        return String(inputValue.searchText).toLowerCase();
      } else if (inputValue.value) {
        return String(inputValue.value).toLowerCase();
      } else if (inputValue.searchValue) {
        return String(inputValue.searchValue).toLowerCase();
      } else {
        const str = String(inputValue);
        if (str.startsWith('{') && str.includes('searchValue')) {
          try {
            const parsed = JSON.parse(str);
            if (parsed.searchValue) {
              return String(parsed.searchValue).toLowerCase();
            }
          } catch (e) {}
        }
        return '';
      }
    } else {
      return String(inputValue || '').toLowerCase();
    }
  } catch (error) {
    return '';
  }
};

// Check if registration is valid for a given airline
export const isValidRegistration = (registration: string, airline: string): boolean => {
  if (!registration || registration === 'None' || registration === 'N/A') return false;
  
  // Add any airline-specific validation logic here if needed
  return true;
};