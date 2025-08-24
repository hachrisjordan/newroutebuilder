import { useState, useCallback } from 'react';
import { 
  processAESLiveSearchResponse, 
  isTokenExpired 
} from '@/lib/aes-frontend-decryption';
import { 
  withRetry, 
  getAirlineRetryConfig, 
  shouldRetryByStatus,
  shouldRetryByError 
} from '@/lib/retry-utils';

interface SearchParams {
  from: string;
  to: string;
  depart: string;
  ADT: number;
}

interface SearchResult {
  program: string;
  from: string;
  to: string;
  depart: string;
  data?: any;
  error?: string;
  encrypted?: boolean;
  token?: string;
  expiresAt?: number;
  decryptionFailed?: boolean;
  decryptionError?: string;
}

export function useLiveSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const searchFlights = useCallback(async (
    params: SearchParams,
    programs: string[] = ['b6', 'as', 'ay', 'aa'],
    onPartialResult?: (result: SearchResult) => void
  ) => {
    setLoading(true);
    setError(null);
    setProgress({ done: 0, total: 0 });
    setResults([]);

    const total = programs.length;
    let done = 0;
    const allResults: SearchResult[] = [];

    try {
      const requests = programs.map(async (program) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          controller.abort();
        }, 60000); // 60s timeout

        const airlineConfig = getAirlineRetryConfig(program);

        const doFetch = async (): Promise<SearchResult> => {
          try {
            const response = await withRetry(
              async () => {
                const res = await fetch(`https://api.bbairtools.com/api/live-search-${program}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(params),
                  signal: controller.signal,
                });

                // Check if we should retry based on status code
                if (shouldRetryByStatus(res.status)) {
                  throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }

                if (!res.ok) {
                  throw new Error(`${program.toUpperCase()} ${params.from}-${params.to} ${params.depart}: ${res.status}`);
                }

                return res;
              },
              airlineConfig.maxAttempts,
              airlineConfig.delayMs,
              (error) => shouldRetryByError(error.message)
            );

            clearTimeout(timeout);

            const encryptedResponse = await response.json();

            // Check if token is expired
            if (isTokenExpired(encryptedResponse)) {
              throw new Error('Search results have expired. Please search again.');
            }

            // Process and decrypt the AES-encrypted response
            const processedResponse = await processAESLiveSearchResponse(encryptedResponse);

            // Check if decryption failed
            if (processedResponse.decryptionFailed) {
              return {
                program,
                from: params.from,
                to: params.to,
                depart: params.depart,
                error: 'Failed to decrypt search results',
                decryptionFailed: true,
                encrypted: true,
                token: encryptedResponse.token,
                expiresAt: encryptedResponse.expiresAt
              };
            }

            return {
              program,
              from: params.from,
              to: params.to,
              depart: params.depart,
              data: processedResponse,
              encrypted: processedResponse._encryptionInfo?.wasEncrypted || false,
              expiresAt: processedResponse._encryptionInfo?.expiresAt
            };
          } catch (err: any) {
            clearTimeout(timeout);

            if (err.message.includes('expired')) {
              return {
                program,
                from: params.from,
                to: params.to,
                depart: params.depart,
                error: 'Search results expired. Please search again.'
              };
            }

            // Check if we should retry for network/status errors
            if (shouldRetryByError(err.message)) {
              throw err; // Let withRetry handle the retry logic
            }

            const isTimeout = err.name === 'AbortError';
            return {
              program,
              from: params.from,
              to: params.to,
              depart: params.depart,
              error: isTimeout ? 'Timeout (60s)' : err.message
            };
          }
        };

        return doFetch();
      });

      const results = await Promise.allSettled(requests);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allResults.push(result.value);
          if (onPartialResult) {
            onPartialResult(result.value);
          }
        } else {
          // Handle rejected promises
          allResults.push({
            program: programs[index],
            from: params.from,
            to: params.to,
            depart: params.depart,
            error: 'Request failed'
          });
        }
        
        done++;
        setProgress({ done, total });
      });

      setResults(allResults);
      
      if (allResults.length === 0) {
        setError("No results found or all requests failed.");
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    setProgress({ done: 0, total: 0 });
  }, []);

  return {
    results,
    loading,
    error,
    progress,
    searchFlights,
    clearResults
  };
}
