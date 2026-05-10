# JeiChat

## Tech Stack

- **Monorepo**: Turborepo with Bun workspaces
- **Backend (`apps/api`)**: NestJS 11 (TypeScript, Express)
- **Frontend (`apps/web`)**: Next.js 16 (App Router, React 19, Server Components + Client Components)
- **Component Library**: shadcn/ui (radix-mira style)
- **Styling**: Tailwind CSS 4 (utility classes only)
- **Icons**: Lucide React (`lucide-react`)
- **Database**: PostgreSQL (Neon) via Drizzle ORM, SQLite fallback for local dev
- **Authentication**: Better Auth (email/password, session cookies)
- **HTTP Client**: Axios (client-side), with `ApiError` normalization
- **Tables**: TanStack Table + TanStack Virtual
- **Data Fetching**: TanStack Query + Axios (client-side), Server Components (server-side)
- **Toasts**: react-hot-toast
- **Caching/Sessions**: Upstash Redis (optional secondary storage for Better Auth)
- **Validation**: class-variance-authority, clsx, tailwind-merge
- **Language**: TypeScript (strict mode)
- **Runtime/Package Manager**: Bun

---

## Project Structure

```
jeichat/
├── apps/
│   ├── api/                              # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts                   # Bootstrap, CORS, port config
│   │   │   ├── load-env.ts               # Loads .env from monorepo root
│   │   │   ├── app.module.ts             # Root module (ConfigModule, DatabaseModule, AuthIntegrationModule)
│   │   │   ├── app.controller.ts         # Root controller (GET /, GET /sample, GET /demo/slow)
│   │   │   ├── app.service.ts            # Root service
│   │   │   ├── auth/
│   │   │   │   ├── auth.ts               # Better Auth instance (secret, DB, Redis, trusted origins)
│   │   │   │   ├── auth.module.ts        # NestBetterAuthModule.forRoot + AuthController
│   │   │   │   ├── auth.controller.ts    # GET /auth/me (session-protected)
│   │   │   │   └── redis-secondary-storage.ts  # Upstash Redis adapter for Better Auth
│   │   │   └── database/
│   │   │       ├── database.module.ts    # Global module exporting DrizzleService
│   │   │       ├── drizzle.service.ts    # Injectable — pool + Drizzle db instance
│   │   │       ├── drizzle.config.ts     # Drizzle Kit CLI config
│   │   │       ├── shared-pg-pool.ts     # Single pg.Pool shared by Better Auth + Drizzle
│   │   │       ├── schema/
│   │   │       │   ├── index.ts          # Re-exports all schemas
│   │   │       │   ├── auth.ts           # Better Auth tables (user, account, verification)
│   │   │       │   └── items.ts          # Example app table
│   │   │       └── drizzle/              # Generated migrations
│   │   └── test/                         # Jest setup + E2E specs
│   │
│   └── web/                              # Next.js frontend
│       ├── app/
│       │   ├── _components/              # Global components — used across 2+ pages
│       │   ├── _hooks/                   # Global hooks — used across 2+ pages
│       │   ├── _libs/                    # Global API functions — used across 2+ pages
│       │   ├── _helpers/                 # Global helpers — used across 2+ pages
│       │   ├── layout.tsx                # Root layout (fonts, Providers)
│       │   ├── page.tsx                  # Home page (async, SSR session)
│       │   ├── providers.tsx             # QueryClient, Toaster, ReactQueryDevtools
│       │   ├── actions.ts                # Server Actions
│       │   ├── globals.css               # Tailwind + CSS variables
│       │   └── [resource]/               # e.g., projects/, messages/, settings/
│       │       ├── page.tsx              # Page entry (Server Component)
│       │       ├── _components/          # Page-specific components
│       │       ├── _hooks/               # Page-specific hooks
│       │       ├── _libs/                # Page-specific API functions
│       │       ├── _helpers/             # Page-specific helpers
│       │       └── [id]/
│       │           ├── page.tsx          # Detail page
│       │           ├── _components/      # Detail-page-only components
│       │           ├── _hooks/           # Detail-page-only hooks
│       │           ├── _libs/            # Detail-page-only API functions
│       │           └── _helpers/         # Detail-page-only helpers
│       ├── components/
│       │   ├── ui/                       # shadcn/ui components — DO NOT manually edit
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   └── ...
│       │   ├── auth-panel.tsx            # Sign-in / sign-up form
│       │   ├── sample-request-card.tsx   # API demo card
│       │   └── http-behavior-demos.tsx   # HTTP error/retry demos
│       ├── lib/
│       │   ├── api.ts                    # Shared Axios instance + interceptors
│       │   ├── api-error.ts              # ApiError class + Nest error parsing
│       │   ├── auth-client.ts            # Better Auth browser client
│       │   ├── auth-server.ts            # Better Auth server client + getServerSession
│       │   ├── sample.ts                 # Sample API query helpers
│       │   ├── http-demo-queries.ts      # Demo queries for HTTP behavior testing
│       │   └── utils.ts                  # cn() utility
│       └── components.json              # shadcn/ui config (radix-mira, hugeicons, CSS vars)
│
├── packages/
│   ├── eslint-config/                    # Shared ESLint configs (base, next, api)
│   └── typescript-config/                # Shared tsconfig (base, nextjs)
│
├── .env.example                          # Environment variable template
├── turbo.json                            # Turbo task config
└── package.json                          # Workspace root
```

### Page Module Pattern

Each page folder is a self-contained module. Code that only one page needs lives next to that page. Code shared across multiple pages lives at the `app/` root level. The `_` prefix opts these folders out of Next.js routing.

| Folder | Contains | Scope rule |
|---|---|---|
| `_components/` | React components (tables, forms, cards, dialogs) | Create here; move to `app/_components/` only when a second page needs it |
| `_hooks/` | TanStack Query hooks and custom React hooks | Create here; promote to `app/_hooks/` when shared |
| `_helpers/` | Pure utility/helper functions specific to this page | Create here; promote to `app/_helpers/` when shared |
| `_libs/` | Axios API functions for this page's resources | Create here; promote to `app/_libs/` when shared |

**Promotion rule:** start local. If the same file is needed by a second page, move it up to the corresponding `app/_*` folder and update imports. Never copy — one source of truth.

---

## Architecture Rules

### NestJS module structure — always

```
Module → imports Controller + Service
Controller → handles HTTP, delegates to Service
Service → contains business logic, queries Database
```

NEVER put business logic in controllers. Controllers handle request/response; services handle logic.

### Authentication — server-first

- **Always resolve the session on the server** via `getServerSession()` from `lib/auth-server.ts` before rendering
- Pages are `async` Server Components that call `getServerSession()` and pass the session down to client components as props
- This prevents empty-state flashes — the user/session is known before any HTML reaches the browser
- Client-side `authClient.useSession()` is supplementary (reactive updates after sign-in/sign-out) — never the primary source of truth on initial load
- If a page requires auth, check the session in the Server Component and redirect or show an error before rendering client children

### Data fetching — client-first on the frontend

- **Default to client-side fetching** with TanStack Query + Axios for all data
- Interactive parts of pages are `"use client"` components that fetch via TanStack Query hooks
- Automatic caching, background refetching, loading/error states, and request cancellation come for free
- **Only use Server Components for data fetching when SEO is specifically required** (public-facing pages that need to be indexed by search engines)
- Auth/session is the exception — always resolved server-side (see above)

### Server/client boundary (frontend)

- Pages are Server Components by default — they resolve the session via `getServerSession()` and pass it to client children
- Interactive UI lives in `"use client"` components that receive session/data as props
- Keep server-only code (auth checks, cookie forwarding) in Server Components and Server Actions — never import `auth-server.ts` in client components

### Avoid `useState` and `useEffect` — exhaust all alternatives first

NEVER reach for `useState` or `useEffect` as a default. They are a last resort after all other options have been exhausted.

**Instead of `useState`:**
- Server Component props — compute and pass data down from the server
- URL search params (`useSearchParams`, `<Link href>`) — for filters, tabs, pagination, modals
- `useActionState` — for form submission state (pending, error, result)
- TanStack Query (`useQuery`, `useMutation`) — for server data and async state
- `useRef` — for mutable values that don't need to trigger a re-render (DOM refs, timers, previous values)
- `useOptimistic` — for optimistic UI updates during server actions
- Uncontrolled inputs with `defaultValue` + `ref` or `FormData` — instead of controlled `onChange` + `setState`

**Instead of `useEffect`:**
- Server Components — fetch data, check auth, compute derived values on the server
- TanStack Query — handles data fetching lifecycle (loading, error, refetch, cache)
- Event handlers — for responding to user interactions (don't sync state in effects)
- `useMemo` / `useCallback` — for derived/computed values that depend on other values
- CSS — for animations, transitions, hover states (not JS-driven effects)

Only use `useState`/`useEffect` when there is genuinely no better alternative — for example, a complex multi-step interaction that can't be expressed as URL state or a query, or a third-party library integration that requires imperative lifecycle management.

### Shared pg Pool (backend)

Better Auth and Drizzle share a single `pg.Pool` via `shared-pg-pool.ts`. The first caller (typically `auth.ts` at module load) creates the pool; Drizzle reuses it. Never create additional pools.

### Request cancellation (frontend)

Always pass `{ signal }` from TanStack Query's `queryFn` to Axios so navigations and cache invalidation abort in-flight requests:

```typescript
export async function fetchSample(ctx?: { signal?: AbortSignal }): Promise<SampleResponse> {
  const { data } = await api.get<SampleResponse>('/sample', { signal: ctx?.signal });
  return data;
}
```

---

## Authentication (Better Auth)

Sessions are managed by Better Auth on the NestJS API. The API is the auth server — it handles sign-up, sign-in, sign-out, and session validation via cookie-based sessions.

### Auth Flow

```
User visits any page
       │
       ▼ (Server Component — page.tsx)
getServerSession() forwards Cookie header to API
       │
       ├─ Session exists → pass user/session as props to client components
       │
       └─ No session → render sign-in / sign-up form (or redirect)
              │
              ▼ (AuthPanel — client component)
              User submits email + password
              │
              ▼ (authClient.signIn.email / authClient.signUp.email)
              POST to API: /api/auth/sign-in (or /sign-up)
              │
              ▼ (Better Auth on API)
              Validates credentials, creates session
              Sets session cookie (httpOnly, secure)
              │
              ▼ (Client)
              authClient.useSession() picks up the new session, UI updates reactively
```

### Auth Files

**API (`apps/api/src/auth/`):**

| File | Purpose |
|---|---|
| `auth.ts` | Better Auth instance config (secret, DB, Redis, trusted origins) |
| `auth.module.ts` | NestJS module — mounts framework routes at `/api/auth/*` + custom `AuthController` |
| `auth.controller.ts` | `GET /auth/me` — returns current user + session (requires valid session) |
| `redis-secondary-storage.ts` | Upstash Redis adapter for Better Auth session/rate-limit reads |

**Web (`apps/web/lib/`):**

| File | Purpose |
|---|---|
| `auth-server.ts` | **Primary** — server-side client + `getServerSession()` — cached per render, forwards `Cookie` header. Use this by default. |
| `auth-client.ts` | **Secondary** — browser-side Better Auth client (`authClient`) — `useSession()` for reactive updates, `signIn`, `signUp`, `signOut` |

### Protecting API Routes

Use the `@Session()` decorator from `@thallesp/nestjs-better-auth` to require authentication. Use `@AllowAnonymous()` to opt out:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { auth } from './auth';

@Controller('resource')
export class ResourceController {
  @Get()
  getAll(@Session() session: UserSession<typeof auth>) {
    // session.user and session.session are available
  }

  @Get('public')
  @AllowAnonymous()
  getPublic() {
    // No auth required
  }
}
```

### Server Session (Default Pattern)

Every page that needs auth should resolve the session server-side first:

```typescript
import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await getServerSession();

  // Option A: redirect unauthenticated users
  if (!session?.data?.user) redirect('/login');

  // Option B: pass session to client components (they render differently based on auth state)
  return <ClientComponent session={session} />;
}
```

`getServerSession()` is wrapped in React `cache` — multiple Server Components/actions in one render share a single fetch. Always prefer this over `authClient.useSession()` for initial page loads.

### Environment Variables

```env
# Better Auth
BETTER_AUTH_SECRET=                        # Required, 32+ chars (openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3001       # API URL where /api/auth/* is served

# Database
DATABASE_URL=                              # PostgreSQL connection string (omit for local SQLite)
PG_POOL_MAX=10                             # pg Pool max connections

# Redis (optional — Better Auth secondary storage)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# API (Nest)
PORT=3001
WEB_ORIGIN=http://localhost:3000           # CORS allowed origin
CORS_CREDENTIALS=                          # Set to 'false' to disable credentials

# Web (Next.js)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_CREDENTIALS=true           # Required for session cookies cross-origin
```

---

## Patterns

### Creating a NestJS Module

```typescript
// apps/api/src/[resource]/[resource].module.ts
import { Module } from '@nestjs/common';
import { ResourceController } from './resource.controller';
import { ResourceService } from './resource.service';

@Module({
  controllers: [ResourceController],
  providers: [ResourceService],
  exports: [ResourceService],
})
export class ResourceModule {}
```

Register in `app.module.ts`:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath }),
    DatabaseModule,
    AuthIntegrationModule,
    ResourceModule, // Add here
  ],
})
export class AppModule {}
```

### Creating a NestJS Controller

```typescript
// apps/api/src/[resource]/resource.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../auth/auth';
import { ResourceService } from './resource.service';

@Controller('resources')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Get()
  findAll(@Session() session: UserSession<typeof auth>) {
    return this.resourceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Session() session: UserSession<typeof auth>) {
    return this.resourceService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateResourceDto, @Session() session: UserSession<typeof auth>) {
    return this.resourceService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateResourceDto, @Session() session: UserSession<typeof auth>) {
    return this.resourceService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Session() session: UserSession<typeof auth>) {
    return this.resourceService.remove(id);
  }
}
```

### Creating a NestJS Service

Inject `DrizzleService` to access the database:

```typescript
// apps/api/src/[resource]/resource.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { resources } from '../database/schema';

@Injectable()
export class ResourceService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll() {
    return this.drizzle.db.select().from(resources);
  }

  async findOne(id: string) {
    const [resource] = await this.drizzle.db
      .select()
      .from(resources)
      .where(eq(resources.id, id));

    if (!resource) throw new NotFoundException(`Resource ${id} not found`);

    return resource;
  }

  async create(data: CreateResourceDto) {
    const [resource] = await this.drizzle.db
      .insert(resources)
      .values(data)
      .returning();
    return resource;
  }

  async update(id: string, data: UpdateResourceDto) {
    await this.findOne(id);
    const [resource] = await this.drizzle.db
      .update(resources)
      .set(data)
      .where(eq(resources.id, id))
      .returning();
    return resource;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.drizzle.db.delete(resources).where(eq(resources.id, id));
  }
}
```

### Creating a Drizzle Schema

**Better Auth tables** use camelCase column names (Better Auth convention). **Application tables** use snake_case column names with camelCase TypeScript properties.

```typescript
// apps/api/src/database/schema/[resource].ts
import { pgTable, text, timestamp, serial } from 'drizzle-orm/pg-core';

export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

Re-export from the schema index:

```typescript
// apps/api/src/database/schema/index.ts
export * from './auth';
export * from './items';
export * from './[resource]';  // Add here
```

After modifying schema, run from `apps/api/`:
```bash
bun run db:generate
bun run db:migrate
```

### Creating an Axios API File (Frontend)

```typescript
// apps/web/lib/[resource].ts
import { api } from '@/lib/api';

export type Resource = {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export const resourceQueryKey = ['resources'] as const;

export async function fetchResources(ctx?: { signal?: AbortSignal }): Promise<Resource[]> {
  const { data } = await api.get<Resource[]>('/resources', { signal: ctx?.signal });
  return data;
}

export async function fetchResource(id: string, ctx?: { signal?: AbortSignal }): Promise<Resource> {
  const { data } = await api.get<Resource>(`/resources/${id}`, { signal: ctx?.signal });
  return data;
}

export async function createResource(payload: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>): Promise<Resource> {
  const { data } = await api.post<Resource>('/resources', payload);
  return data;
}
```

### Creating a TanStack Query Hook (Frontend)

```typescript
// apps/web/hooks/use-[resource].ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchResources, fetchResource, createResource, resourceQueryKey } from '@/lib/resource';

export function useResources() {
  return useQuery({
    queryKey: resourceQueryKey,
    queryFn: ({ signal }) => fetchResources({ signal }),
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: [...resourceQueryKey, id],
    queryFn: ({ signal }) => fetchResource(id, { signal }),
    enabled: !!id,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceQueryKey });
    },
  });
}
```

### Creating a Page (Default — Server Auth + Client Fetching)

Pages are Server Components that resolve auth, then render client components for interactive data fetching:

```typescript
// apps/web/app/[resource]/page.tsx (Server Component — default)
import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { ResourceList } from '@/components/resource-list';

export default async function ResourcesPage() {
  const session = await getServerSession();
  if (!session?.data?.user) redirect('/login');

  return <ResourceList session={session} />;
}
```

```typescript
// apps/web/components/resource-list.tsx (Client Component — interactive)
'use client';

import { useResources } from '@/hooks/use-resources';
import { Button } from '@/components/ui/button';

export function ResourceList({ session }: { session: /* session type */ }) {
  const { data, isLoading, error } = useResources();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-destructive">Failed to load resources</div>;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Resources</h1>
        <Button>New Resource</Button>
      </div>
      {/* Render data */}
    </div>
  );
}
```

### Creating a Table (TanStack Table + TanStack Virtual + shadcn/ui)

```typescript
// app/[resource]/_components/resource-table.tsx
'use client';

import { useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const columns: ColumnDef<Resource>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
  },
];

export function ResourceTable({ data }: { data: Resource[] }) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 40,
    overscan: 20,
  });

  return (
    <div ref={tableContainerRef} className="h-[600px] overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

For small datasets that don't need virtualization, omit `useVirtualizer` and use `getPaginationRowModel()` with pagination controls instead.

### Error Handling (Frontend)

All Axios errors are normalized to `ApiError` by the response interceptor in `lib/api.ts`. The `Providers` component surfaces errors as toasts automatically via the `QueryCache` and `MutationCache` `onError` callbacks. Cancelled requests are silently ignored.

**Retry logic:**
- 4xx errors: no retry (client error, retrying won't help)
- 5xx / network errors: 1 retry
- Cancelled requests: no retry

```typescript
import { isApiError } from '@/lib/api-error';

// In a component — check specific error types
if (isApiError(error)) {
  if (error.statusCode === 404) { /* handle not found */ }
  if (error.isCancelled) { /* request was aborted */ }
}
```

---

## Conventions

### Naming

| Thing | Convention | Example |
|---|---|---|
| NestJS module files | kebab-case | `resource.module.ts` |
| NestJS controller files | kebab-case | `resource.controller.ts` |
| NestJS service files | kebab-case | `resource.service.ts` |
| NestJS class names | PascalCase + suffix | `ResourceController`, `ResourceService` |
| Component files | kebab-case | `auth-panel.tsx` |
| Component names | PascalCase | `AuthPanel` |
| Hook files | `use-` prefix, kebab-case | `use-resources.ts` |
| Hook names | `use` prefix, camelCase | `useResources` |
| API query files (frontend) | kebab-case | `sample.ts` |
| Drizzle schema files | kebab-case | `items.ts`, `auth.ts` |
| Database columns (app tables) | snake_case in Drizzle string arg | `'created_at'`, `'updated_at'` |
| Database columns (auth tables) | camelCase — Better Auth convention | `'emailVerified'`, `'createdAt'` |
| Drizzle TypeScript properties | camelCase | `createdAt`, `emailVerified` |

### Import Order

```typescript
// 1. Node.js built-ins
import { existsSync } from 'node:fs';

// 2. NestJS / Next.js / React
import { Injectable } from '@nestjs/common';
import { useState } from 'react';

// 3. Third-party libraries
import { useQuery } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';

// 4. Internal — components
import { Button } from '@/components/ui/button';

// 5. Internal — lib (hooks, services, utils)
import { api } from '@/lib/api';
import { DrizzleService } from '../database/drizzle.service';
```

### Commit Messages

```
feat: add milestone tracker to project dashboard
fix: correct date calculation in schedule report
refactor: extract shared table config
style: update button spacing on dashboard
chore: update dependencies
```

---

## Commands

All commands use `bun`. Never use `npm` or `npx`.

### Root (runs across all workspaces via Turbo)

```bash
bun run dev          # Start API + Web dev servers in parallel
bun run build        # Build all apps
bun run lint         # Lint all workspaces
bun run format       # Prettier format all TS/TSX/MD files
bun run check-types  # Type-check all workspaces
```

### API (`apps/api/`)

```bash
bun run dev          # NestJS watch mode (port 3001)
bun run build        # Compile to dist/
bun run start:prod   # Production server (node dist/main)
bun run test         # Jest unit tests
bun run test:e2e     # E2E tests
bun run db:generate  # Generate Drizzle migrations from schema
bun run db:migrate   # Apply migrations to database
bun run db:push      # Push schema directly (skip migration files)
bun run db:studio    # Open Drizzle Studio web UI
```

### Web (`apps/web/`)

```bash
bun run dev          # Next.js dev server (port 3000)
bun run build        # Production build
bun run lint         # ESLint (zero warnings enforced)
bun run check-types  # Type generation + TypeScript check
```

### Adding shadcn/ui Components

```bash
cd apps/web && bunx shadcn@latest add [component]
```

---

## UI & Styling

- **All UI uses shadcn/ui** components from `apps/web/components/ui/`. Always use shadcn components — never build custom components if shadcn has an equivalent or can be composed to achieve the same result. Check the [shadcn/ui docs](https://ui.shadcn.com) before creating anything custom. If a component doesn't exist yet, add it via `bunx shadcn@latest add [component]`.
- **shadcn style is `radix-mira`** — configured in `components.json`.
- **Styling is Tailwind CSS only** — utility classes in markup. No custom CSS files.
- **Icons are lucide-react** — import from `lucide-react`. Example: `import { Plus, Trash2, Search } from "lucide-react";`
- **Toasts use react-hot-toast** — `toast.success("Done")`, `toast.error("Failed")`. Auto-wired for query/mutation errors in `Providers`.
- **Theme** lives in `apps/web/app/globals.css` (CSS variables for colours).
- **Responsive** — use Tailwind breakpoints (`sm:`, `md:`, `lg:`). Mobile-first.

---

## Do NOT

- **Put business logic in controllers** — use services
- **Put business logic in components** — call the API via TanStack Query hooks
- **Use `any` type** — always provide explicit types
- **Create multiple Axios instances** — use the shared instance in `apps/web/lib/api.ts` (exception: demo instances for testing)
- **Create additional pg Pools** — use `getSharedPgPool()` from `shared-pg-pool.ts`
- **Import server-only code in client components** — keep the server/client boundary clean
- **Write custom CSS** — use Tailwind utility classes
- **Build custom UI components** — always use shadcn/ui. Compose existing shadcn primitives before creating anything from scratch. Only build custom if shadcn genuinely has no component or composition that fits.
- **Call Axios directly in components** — always go through a TanStack Query hook
- **Hardcode secrets, URLs, or credentials** — use environment variables (`.env` at monorepo root)
- **Use `npm` or `npx`** — use `bun` and `bunx` for all commands
- **Manually edit `components/ui/` files** — these are managed by shadcn/ui CLI
- **Skip `signal` in query functions** — always forward AbortSignal from TanStack Query to Axios
- **Use `useState` or `useEffect` as a first choice** — exhaust all alternatives first: Server Components, URL state, `useActionState`, TanStack Query, `useRef`, `useMemo`, event handlers, CSS. These two hooks are a last resort.
