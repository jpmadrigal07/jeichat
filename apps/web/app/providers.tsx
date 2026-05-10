'use client';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { isApiError } from '@/lib/api-error';

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((d) => ({
    default: d.ReactQueryDevtools,
  })),
);

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isApiError(error)) {
    if (error.isCancelled) return false;
    const s = error.statusCode;
    if (s !== undefined && s >= 400 && s < 500) return false;
  }
  /** One retry for network / 5xx / unknown (matches previous `retry: 1`). */
  return failureCount < 1;
}

function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return 'Request failed';
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (isApiError(error) && error.isCancelled) return;
            toast.error(getErrorMessage(error));
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (isApiError(error) && error.isCancelled) return;
            toast.error(getErrorMessage(error));
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: shouldRetryQuery,
            refetchOnWindowFocus: true,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="bottom-right" />
      {process.env.NODE_ENV === 'development' ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools
            buttonPosition="bottom-right"
            initialIsOpen={false}
          />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  );
}
