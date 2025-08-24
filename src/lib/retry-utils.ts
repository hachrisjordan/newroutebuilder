/**
 * Retry utilities for handling failed API requests
 * Provides consistent retry behavior across the application
 */

// Retry configuration
export const RETRY_STATUS_CODES = [500, 406]; // Retry server errors (500s) and 406s for live search
export const RETRY_DELAY_MS = 5000; // 5 seconds
export const MAX_RETRY_ATTEMPTS = 3;

// Helper function to delay execution
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if a response should trigger a retry based on status code
 */
export function shouldRetryByStatus(status: number): boolean {
  return RETRY_STATUS_CODES.includes(status);
}

/**
 * Check if an error message indicates a retryable error
 */
export function shouldRetryByError(errorMessage: string): boolean {
  const retryableErrors = [
    '500',
    '406', // Retry 406s for live search
    'Network error',
    'socket hang up',
    'American microservice error',
    'request to https://www.aa.com/booking/api/search/itinerary failed'
  ];
  
  return retryableErrors.some(error => errorMessage.includes(error));
}

/**
 * Execute a function with retry logic
 * @param fn - The function to execute
 * @param maxAttempts - Maximum number of retry attempts
 * @param delayMs - Delay between retries in milliseconds
 * @param shouldRetry - Function to determine if retry is needed
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  delayMs: number = RETRY_DELAY_MS,
  shouldRetry: (error: any) => boolean = shouldRetryByError
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      
      if (error instanceof Error) {
        console.log(`Attempt ${attempt} failed with error:`, error.message);
        console.log(`Should retry?`, shouldRetry(error));
      }
      
      if (attempt >= maxAttempts || !shouldRetry(error)) {
        console.log(`Not retrying - max attempts reached or error not retryable`);
        throw error;
      }
      
      console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms... (${attempt}/${maxAttempts})`);
      await delay(delayMs);
    }
  }
  
  throw lastError;
}

/**
 * Execute a fetch request with retry logic
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param maxAttempts - Maximum number of retry attempts
 * @param delayMs - Delay between retries in milliseconds
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  delayMs: number = RETRY_DELAY_MS
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, options);
      
      // Check if we should retry based on status code
      if (shouldRetryByStatus(response.status)) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    },
    maxAttempts,
    delayMs,
    (error) => shouldRetryByError(error.message)
  );
}

/**
 * Retry configuration for specific airlines
 */
export const AIRLINE_RETRY_CONFIG = {
  'aa': {
    maxAttempts: 3,
    delayMs: 5000,
    retryableErrors: [
      'American microservice error',
      'Network error when connecting to American Airlines',
      'socket hang up'
    ]
  },
  'b6': {
    maxAttempts: 3,
    delayMs: 5000,
    retryableErrors: ['500', '406']
  },
  'as': {
    maxAttempts: 2,
    delayMs: 3000,
    retryableErrors: ['500', '406']
  },
  'ay': {
    maxAttempts: 2,
    delayMs: 3000,
    retryableErrors: ['500', '406']
  }
};

/**
 * Get retry configuration for a specific airline
 */
export function getAirlineRetryConfig(airline: string) {
  return AIRLINE_RETRY_CONFIG[airline as keyof typeof AIRLINE_RETRY_CONFIG] || {
    maxAttempts: MAX_RETRY_ATTEMPTS,
    delayMs: RETRY_DELAY_MS,
    retryableErrors: ['500', '406']
  };
}
