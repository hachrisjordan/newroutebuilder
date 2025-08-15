import { AlertCircle, Clock, Key, Database, Globe, Zap } from 'lucide-react';

export interface ApiError {
  status?: number;
  message: string;
  details?: string;
}

interface ApiErrorDisplayProps {
  error: string | ApiError;
  className?: string;
}

/**
 * Enhanced error display component that categorizes and styles API errors
 * based on their type and provides helpful context to users.
 */
export function ApiErrorDisplay({ error, className = '' }: ApiErrorDisplayProps) {
  // Parse error object from string or object
  const parseError = (err: string | ApiError): ApiError => {
    // If it's already an ApiError object
    if (typeof err === 'object' && err !== null && 'message' in err) {
      return err as ApiError;
    }

    // If it's a string, try to parse as JSON first
    if (typeof err === 'string') {
      try {
        const parsed = JSON.parse(err);
        if (parsed.message || parsed.error) {
          return {
            status: parsed.status,
            message: parsed.message || parsed.error,
            details: parsed.details,
          };
        }
        // If it's just a plain string, use it as the message
        return { message: err };
      } catch {
        // If JSON parsing fails, use the string as-is
        return { message: err };
      }
    }

    // Fallback for unknown error types
    return { message: 'An unexpected error occurred' };
  };

  const apiError = parseError(error);
  const { status, message, details } = apiError;

  // Determine error category and styling based on status code and message content
  const getErrorInfo = () => {
    const lowerMessage = message.toLowerCase();

    // 400 - Input Validation Errors
    if (status === 400 || lowerMessage.includes('invalid input')) {
      return {
        icon: AlertCircle,
        variant: 'destructive' as const,
        category: 'Input Validation Error',
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        borderColor: 'border-red-200 dark:border-red-800',
      };
    }

    // 429 - Rate Limiting Errors
    if (status === 429 || lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
      return {
        icon: Clock,
        variant: 'destructive' as const,
        category: 'Rate Limit Exceeded',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-950/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
      };
    }

    // API Key/Database Errors
    if (lowerMessage.includes('api key') || lowerMessage.includes('pro_key') || lowerMessage.includes('quota')) {
      return {
        icon: Key,
        variant: 'destructive' as const,
        category: 'API Key Issue',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-950/20',
        borderColor: 'border-purple-200 dark:border-purple-800',
      };
    }

    // Database/Environment Errors
    if (lowerMessage.includes('database') || lowerMessage.includes('supabase') || lowerMessage.includes('environment')) {
      return {
        icon: Database,
        variant: 'destructive' as const,
        category: 'Database Error',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
      };
    }

    // 404 - Route Finding Errors
    if (status === 404 || lowerMessage.includes('no eligible routes') || lowerMessage.includes('not found')) {
      return {
        icon: Globe,
        variant: 'default' as const,
        category: 'No Routes Found',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
      };
    }

    // Redis/Cache Errors (usually non-critical)
    if (lowerMessage.includes('redis') || lowerMessage.includes('cache')) {
      return {
        icon: Zap,
        variant: 'default' as const,
        category: 'Cache Warning',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 dark:bg-gray-950/20',
        borderColor: 'border-gray-200 dark:border-gray-800',
      };
    }

    // Default - General Server Errors
    return {
      icon: AlertCircle,
      variant: 'destructive' as const,
      category: 'Server Error',
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800',
    };
  };

  const errorInfo = getErrorInfo();
  const Icon = errorInfo.icon;

  // Format the message for better readability
  const formatMessage = (msg: string): string => {
    // Clean up common API message patterns
    let formatted = msg
      .replace(/^Invalid input\s*/, '') // Remove redundant "Invalid input" prefix
      .replace(/Internal server error\s*/, '') // Remove redundant prefix
      .trim();

    // If message is empty after cleanup, use a generic message based on status
    if (!formatted) {
      if (status === 400) formatted = 'Please check your input parameters.';
      else if (status === 404) formatted = 'No routes found for your search criteria.';
      else if (status === 429) formatted = 'Please wait before making another request.';
      else if (status === 500) formatted = 'A server error occurred. Please try again.';
      else formatted = 'An unexpected error occurred.';
    }

    return formatted;
  };

  const formattedMessage = formatMessage(message);

  return (
    <div 
      role="alert"
      className={`relative w-full rounded-lg border p-4 ${errorInfo.bgColor} ${errorInfo.borderColor} ${className}`}
    >
      <div className="flex gap-3">
        <Icon className={`h-4 w-4 ${errorInfo.color} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 space-y-2">
          <div className="flex flex-col gap-1">
            <div className={`text-sm font-medium ${errorInfo.color}`}>
              {errorInfo.category}
              {status && ` (${status})`}
            </div>
            <div className="text-sm text-foreground">
              {formattedMessage}
            </div>
            {details && (
              <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted/50 rounded border">
                <strong>Details:</strong> {details}
              </div>
            )}
          </div>
        
        {/* Helpful suggestions based on error type */}
        {(() => {
          const lowerMessage = message.toLowerCase();
          let suggestion: string | null = null;

          // Rate limit suggestions
          if (status === 429 || lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
            if (lowerMessage.includes('date range')) {
              suggestion = 'Try searching with a shorter date range (3 days or less for free accounts).';
            } else if (lowerMessage.includes('stops')) {
              suggestion = 'Try reducing the maximum number of stops in your search.';
            } else if (lowerMessage.includes('combination')) {
              suggestion = 'Try selecting fewer airport combinations.';
            } else if (lowerMessage.includes('page size')) {
              suggestion = 'Try viewing fewer results per page.';
            } else if (lowerMessage.includes('unique search')) {
              suggestion = 'You can filter and paginate existing results, or wait before starting a new search.';
            } else if (lowerMessage.includes('daily limit')) {
              suggestion = 'Daily search limit reached. Quota resets at midnight UTC.';
            } else {
              suggestion = 'Please wait a few minutes before trying again, or try reducing your search scope.';
            }
          }
          // No routes found suggestions
          else if (status === 404 || lowerMessage.includes('no eligible routes') || lowerMessage.includes('not found')) {
            suggestion = 'Try expanding your search with different airports, dates, or allowing more stops.';
          }
          // API key suggestions
          else if (lowerMessage.includes('api key') || lowerMessage.includes('pro_key') || lowerMessage.includes('quota')) {
            suggestion = 'Check your API key in settings or consider upgrading if you\'ve reached quota limits.';
          }
          // Input validation suggestions
          else if (status === 400 || lowerMessage.includes('invalid')) {
            suggestion = 'Please check that all search parameters are valid and try again.';
          }

          if (suggestion) {
            return (
              <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/30 rounded">
                💡 <strong>Tip:</strong> {suggestion}
              </div>
            );
          }
          
          return null;
        })()}
        </div>
      </div>
    </div>
  );
}
