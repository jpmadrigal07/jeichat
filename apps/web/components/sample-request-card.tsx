'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { isApiError } from '@/lib/api-error';
import { fetchSample, sampleQueryKey } from '@/lib/sample';

function showConnectionHint(error: unknown): boolean {
  if (!isApiError(error)) return true;
  if (error.isCancelled) return false;
  /** Server responded — problem is not “API unreachable”. */
  if (error.statusCode !== undefined) return false;
  return true;
}

/** Cache / staleness tuned for this demo endpoint (see also root `Providers` defaults). */
const SAMPLE_STALE_MS = 60 * 1000;
const SAMPLE_GC_MS = 10 * 60 * 1000;

export function SampleRequestCard() {
  const { data, error, isPending, isFetching, failureCount, refetch } =
    useQuery({
      queryKey: sampleQueryKey,
      queryFn: ({ signal }) => fetchSample({ signal }),
      staleTime: SAMPLE_STALE_MS,
      gcTime: SAMPLE_GC_MS,
    });

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Sample API request</CardTitle>
        <CardDescription>
          Client fetch with{' '}
          <code className="text-xs">@tanstack/react-query</code> to{' '}
          <code className="text-xs">GET /sample</code> via{' '}
          <code className="text-xs">@/lib/api</code>. Cached{' '}
          <code className="text-xs">{SAMPLE_STALE_MS / 1000}s</code> stale,{' '}
          <code className="text-xs">{SAMPLE_GC_MS / 60_000}m</code> garbage-collect.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isPending ? (
          <p className="text-muted-foreground">Loading sample…</p>
        ) : error ? (
          <p className="text-destructive">
            {isApiError(error) && error.statusCode !== undefined ? (
              <>
                <span className="font-medium">[{error.statusCode}]</span>{' '}
                {error.message}
              </>
            ) : (
              error.message
            )}
            {showConnectionHint(error) ? (
              <>
                {' '}
                — If the API is down, start it (e.g.{' '}
                <code className="text-xs">bun run dev</code> from the repo root)
                and set <code className="text-xs">NEXT_PUBLIC_API_URL</code> in{' '}
                <code className="text-xs">.env</code>.
              </>
            ) : null}
          </p>
        ) : (
          <>
            <p>
              <span className="text-muted-foreground">message:</span>{' '}
              {data.message}
            </p>
            <p>
              <span className="text-muted-foreground">servedAt:</span>{' '}
              <code className="text-xs">{data.servedAt}</code>
            </p>
          </>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? 'Refetching…' : 'Refetch'}
          </button>
          {failureCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              Failed attempts: {failureCount}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
