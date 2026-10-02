# Testing the HTTP client (Axios + TanStack Query)

This app uses a shared Axios instance (`@/lib/api`) that maps failures to `ApiError` (`@/lib/api-error`), React Query retries tuned for **no retry on 4xx**, and **`signal`** forwarding so requests abort when queries cancel.

## Interactive demos (home page)

Open `/` and scroll to **HTTP client demos**. Three cards run side by side:

| Card | What it does |
|------|----------------|
| **404** | `GET …/client-demo-unknown-route` → Nest **404** JSON. Expect **`failureCount: 1`** (no retry for 4xx). |
| **Connection refused** | Axios client for `127.0.0.1:59999` (unused port). Expect **`failureCount` up to 2** (one retry). **`statusCode`** empty. |
| **Abort** | Starts `GET /demo/slow` (~25s). Use **Cancel in-flight** while fetching → **`isCancelled: true`**. |

## Prerequisites

- From the repo root: `bun run dev` (runs API + web via Turborepo), or run `apps/api` and `apps/web` separately.
- `apps/web/.env`: `NEXT_PUBLIC_API_URL=http://localhost:3002` (or your API port).

## Scenarios

### 1. Success

With API up and URL correct, the sample card loads `message` and `servedAt`. DevTools → Network shows `GET …/sample` **200**.

### 2. Network / API down (retry once)

Stop the API only (or use a wrong host that refuses TCP). You should see an `ApiError` **without** `[status]` (no HTTP response). React Query retries **once** (`failureCount` can go to **2** total attempts: initial + 1 retry). The card shows the connection hint about `NEXT_PUBLIC_API_URL`.

### 3. HTTP 404 from Nest (no retry)

Hit a route Nest does not expose without changing the sample card code—e.g. curl:

```bash
curl -s -o /dev/null -w "%{http_code}" "$NEXT_PUBLIC_API_URL/not-a-route"
```

Expect **404** with JSON body. The **404 demo card** on the home page calls `GET …/client-demo-unknown-route` for the same idea.

### 4. Timeout

The Axios instance uses `timeout: 30_000`. To simulate a slow server you’d need an endpoint that delays longer than 30s (not shipped here); you’d get `ApiError` with no `statusCode` or with whatever the adapter returns after timeout.

### 5. Abort / cancellation

React Query passes `AbortSignal` into `fetchSample({ signal })`. When a query is **removed** or **cancelled** (e.g. component unmount during fetch), Axios aborts the request. The error should be **`ApiError` with `isCancelled: true`** and message **“Request cancelled”**—often you won’t see it in UI because the component unmounted.

To observe cancellation locally: open DevTools → Network, throttle to **Slow 3G**, trigger refetch, navigate away quickly; the pending request should show **(canceled)**.

## Quick reference

| Situation              | Retries | Typical `ApiError.statusCode` |
| ---------------------- | ------- | ------------------------------- |
| 4xx from server        | No      | Set                             |
| 5xx / network / unknown | Yes (×1) | Maybe omitted (network)        |
| User abort             | No      | Omitted; `isCancelled: true`    |

Mutations default to **`retry: 0`** in `Providers`.
