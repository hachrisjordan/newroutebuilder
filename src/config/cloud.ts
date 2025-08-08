// Configuration for external API endpoints and cloud storage
export const API_BASE_URL = 'https://api.bbairtools.com';
export const CLOUD_STORAGE_BASE_URL = 'https://storage.bbairtools.com';

// Function to get seat configuration URL for a specific airline
export const getSeatConfigUrl = (airline: string): string => {
  return `${CLOUD_STORAGE_BASE_URL}/seat-configs/${airline}.json`;
};