export interface ApiError {
  status?: number;
  message: string;
  details?: string;
}

/**
 * Utility to parse and standardize API error responses
 */
export function parseApiError(error: unknown): ApiError {
  // If it's already an ApiError object
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return error as ApiError;
  }

  // If it's a string, try to parse as JSON first
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error);
      if (parsed.message || parsed.error) {
        return {
          status: parsed.status,
          message: parsed.message || parsed.error,
          details: parsed.details,
        };
      }
      // If it's just a plain string, use it as the message
      return { message: error };
    } catch {
      // If JSON parsing fails, use the string as-is
      return { message: error };
    }
  }

  // If it's an Error object
  if (error instanceof Error) {
    try {
      // Try to parse the error message as JSON in case it contains structured data
      const parsed = JSON.parse(error.message);
      return {
        status: parsed.status,
        message: parsed.message || parsed.error || error.message,
        details: parsed.details,
      };
    } catch {
      // If not JSON, use the error message directly
      return { message: error.message };
    }
  }

  // Fallback for unknown error types
  return { message: 'An unexpected error occurred' };
}

/**
 * Extract helpful user-facing messages from API errors
 */
export function getErrorSuggestion(error: ApiError): string | null {
  const message = error.message.toLowerCase();
  const status = error.status;

  // Rate limit suggestions
  if (status === 429 || message.includes('rate limit') || message.includes('too many')) {
    if (message.includes('date range')) {
      return 'Try searching with a shorter date range (3 days or less for free accounts).';
    }
    if (message.includes('stops')) {
      return 'Try reducing the maximum number of stops in your search.';
    }
    if (message.includes('combination')) {
      return 'Try selecting fewer airport combinations.';
    }
    if (message.includes('page size')) {
      return 'Try viewing fewer results per page.';
    }
    if (message.includes('unique search')) {
      return 'You can filter and paginate existing results, or wait before starting a new search.';
    }
    if (message.includes('daily limit')) {
      return 'Daily search limit reached. Quota resets at midnight UTC.';
    }
    return 'Please wait a few minutes before trying again, or try reducing your search scope.';
  }

  // No routes found suggestions
  if (status === 404 || message.includes('no eligible routes') || message.includes('not found')) {
    return 'Try expanding your search with different airports, dates, or allowing more stops.';
  }

  // API key suggestions
  if (message.includes('api key') || message.includes('pro_key') || message.includes('quota')) {
    return 'Check your API key in settings or consider upgrading if you\'ve reached quota limits.';
  }

  // Input validation suggestions
  if (status === 400 || message.includes('invalid')) {
    return 'Please check that all search parameters are valid and try again.';
  }

  return null;
}

/**
 * Determine if an error is user-actionable or a system issue
 */
export function isUserActionableError(error: ApiError): boolean {
  const message = error.message.toLowerCase();
  const status = error.status;

  // User can take action for these errors
  const actionableConditions = [
    status === 400, // Invalid input
    status === 404, // No routes found
    status === 429, // Rate limiting
    message.includes('api key'),
    message.includes('invalid'),
    message.includes('rate limit'),
    message.includes('too many'),
    message.includes('quota'),
    message.includes('not found'),
  ];

  return actionableConditions.some(condition => condition);
}
