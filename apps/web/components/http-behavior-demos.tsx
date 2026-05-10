'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { isApiError } from '@/lib/api-error';
import {
  fetchDemo404,
  fetchDemoSlow,
  fetchDemoUnreachable,
  httpDemoQueryKeys,
} from '@/lib/http-demo-queries';

function QueryMetrics(props: {
  status: string;
  fetchStatus: string;
  failureCount: number;
  error: Error | null;
}) {
  const { status, fetchStatus, failureCount, error } = props;
  return (
    <ul className="text-muted-foreground space-y-1 font-mono text-xs">
      <li>
        <span className="text-foreground">query.status:</span> {status}
      </li>
      <li>
        <span className="text-foreground">fetchStatus:</span> {fetchStatus}
      </li>
      <li>
        <span className="text-foreground">failureCount:</span> {failureCount}{' '}
        <span className="text-[10px] leading-none opacity-80">
          (React Query: failures so far; retries increase attempts)
        </span>
      </li>
      {error ? (
        <li className="pt-1 text-destructive">
          <span className="text-foreground">error.message:</span> {error.message}
        </li>
      ) : null}
      {error && isApiError(error) ? (
        <li className="text-muted-foreground">
          <span className="text-foreground">ApiError:</span> statusCode=
          {error.statusCode === undefined ? '∅' : error.statusCode},{' '}
          isCancelled=
          {String(error.isCancelled)}
        </li>
      ) : null}
    </ul>
  );
}

/**
 * GET unknown path → Nest 404 JSON. `shouldRetryQuery` returns false for 4xx, so
 * **failureCount stays 1** after the single failed attempt.
 */
function DemoHttp404Card() {
  const q = useQuery({
    queryKey: httpDemoQueryKeys.notFound,
    queryFn: ({ signal }) => fetchDemo404({ signal }),
  });

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">1 — HTTP 404 (no retry)</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Requests <code className="text-xs">GET …/client-demo-unknown-route</code>. Nest
          responds with a JSON 404. Global retry skips{' '}
          <strong>client errors (4xx)</strong>, so you should see{' '}
          <code className="text-xs">failureCount: 1</code> — no silent second hit.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3 text-sm">
        {q.isPending ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : q.isError ? (
          <p className="text-destructive text-xs leading-relaxed">
            Expected failure (demo). Compare <code className="text-xs">failureCount</code>{' '}
            with the “Retry” card.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Unexpected success.</p>
        )}
        <QueryMetrics
          status={q.status}
          fetchStatus={q.fetchStatus}
          failureCount={q.failureCount}
          error={q.error}
        />
      </CardContent>
    </Card>
  );
}

/**
 * Hit a closed TCP port → connection refused. No HTTP status on{' '}
 * <code className="text-xs">ApiError</code>. Retries **once** →{' '}
 * <code className="text-xs">failureCount</code> can reach <strong>2</strong>.
 */
function DemoConnectionRetryCard() {
  const q = useQuery({
    queryKey: httpDemoQueryKeys.unreachable,
    queryFn: ({ signal }) => fetchDemoUnreachable({ signal }),
  });

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">2 — Connection refused (retry ×1)</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Uses a separate Axios client aimed at{' '}
          <code className="text-xs">127.0.0.1:59999</code> (nothing listening). That is a{' '}
          <strong>network</strong> failure — no <code className="text-xs">statusCode</code>.
          Default retry allows <strong>one</strong> extra attempt, so{' '}
          <code className="text-xs">failureCount</code> often ends at <strong>2</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3 text-sm">
        {q.isPending ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : q.isError ? (
          <p className="text-destructive text-xs leading-relaxed">
            Expected failure (demo). Watch <code className="text-xs">failureCount</code> climb
            to 2 as React Query retries once.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Unexpected success.</p>
        )}
        <QueryMetrics
          status={q.status}
          fetchStatus={q.fetchStatus}
          failureCount={q.failureCount}
          error={q.error}
        />
      </CardContent>
    </Card>
  );
}

/**
 * Long-running GET — cancel via React Query while in flight.
 */
function DemoAbortCard() {
  const queryClient = useQueryClient();
  const [armed, setArmed] = useState(false);

  const q = useQuery({
    queryKey: httpDemoQueryKeys.slow,
    queryFn: ({ signal }) => fetchDemoSlow({ signal }),
    enabled: armed,
  });

  const reset = () => {
    setArmed(false);
    void queryClient.resetQueries({ queryKey: httpDemoQueryKeys.slow });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">3 — Slow request + abort</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Starts <code className="text-xs">GET /demo/slow</code> (~25s on the server). Axios uses{' '}
          <code className="text-xs">timeout: 0</code> so the browser does not give up before you
          cancel. Click <strong>Cancel</strong> — React Query aborts the signal → Axios →{' '}
          <code className="text-xs">ApiError</code> with{' '}
          <code className="text-xs">isCancelled: true</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
            onClick={() => setArmed(true)}
            disabled={armed && q.isFetching}
          >
            Start slow request (~25s)
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
            onClick={() =>
              void queryClient.cancelQueries({
                queryKey: httpDemoQueryKeys.slow,
              })
            }
            disabled={!q.isFetching}
          >
            Cancel in-flight
          </button>
          <button
            type="button"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium hover:bg-destructive/10"
            onClick={reset}
          >
            Reset
          </button>
        </div>

        {!armed ? (
          <p className="text-muted-foreground text-xs">
            Idle — press Start to attach the query (passes <code className="text-xs">signal</code>{' '}
            into Axios).
          </p>
        ) : q.isFetching ? (
          <p className="text-amber-600 text-xs dark:text-amber-500">
            In flight… cancel now to see <code className="text-xs">Request cancelled</code>, or
            wait ~25s for success.
          </p>
        ) : q.isError ? (
          <p className="text-destructive text-xs">
            {isApiError(q.error) && q.error.isCancelled
              ? 'Aborted as expected — check isCancelled below.'
              : 'Failed — see metrics.'}
          </p>
        ) : q.isSuccess ? (
          <p className="text-xs text-green-600 dark:text-green-500">
            Completed without cancel — response: {JSON.stringify(q.data)}
          </p>
        ) : null}

        <QueryMetrics
          status={q.status}
          fetchStatus={q.fetchStatus}
          failureCount={q.failureCount}
          error={q.error}
        />
      </CardContent>
    </Card>
  );
}

export function HttpBehaviorDemos() {
  return (
    <section className="flex max-w-6xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          HTTP client demos (Axios + React Query)
        </h2>
        <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-relaxed">
          Three isolated queries illustrate{' '}
          <strong className="text-foreground">4xx (no retry)</strong>,{' '}
          <strong className="text-foreground">network + retry</strong>, and{' '}
          <strong className="text-foreground">abort</strong>. Keep the API running; card 2 does not
          use it (wrong port). Card 3 needs <code className="text-xs">GET /demo/slow</code> on the
          API.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-3">
        <DemoHttp404Card />
        <DemoConnectionRetryCard />
        <DemoAbortCard />
      </div>
    </section>
  );
}
