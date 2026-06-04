# Step 1 — R2 storage setup

Goal: have a working R2 bucket, the AWS SDK v3 wired into NestJS, and a single shared S3 client that the rest of the feature depends on.

## 1.1 Provision the R2 bucket

In the Cloudflare dashboard:

1. R2 → Create bucket → name it `jeichat-attachments` (and `jeichat-attachments-dev` for local).
2. R2 → Manage R2 API Tokens → create a token with **Object Read & Write** scoped to the bucket. Record:
   - Access Key ID
   - Secret Access Key
   - Account ID (visible on the R2 overview page)
3. R2 → Settings → CORS policy. Allow `PUT` and `GET` from the web origin so browsers can upload directly via presigned URLs:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://<prod-web-origin>"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type", "content-length"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

4. Decide on the public download strategy. Pick one:
   - **(Recommended) Private bucket + presigned GET URLs** — bucket stays private; the API issues short-lived signed download URLs after permission check. Best for permission-gated channels.
   - **Public bucket via R2.dev or custom domain** — simpler but bypasses workspace permissions. Only acceptable if attachments are considered public to anyone with the link.

This plan assumes the **private bucket** path. The `06-permissions-security.md` step covers signed downloads.

## 1.2 Environment variables

Add to `.env.example` at the monorepo root:

```env
# Cloudflare R2 (S3-compatible)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=jeichat-attachments-dev
R2_PUBLIC_URL=                          # Optional: only set if using a public custom domain
R2_PRESIGN_EXPIRES_SECONDS=600          # Presigned URL TTL (10 min default)
R2_MAX_UPLOAD_BYTES=26214400            # 25 MiB per file
```

Document these in `CLAUDE.md` under the Environment Variables section once implemented.

## 1.3 Install the AWS SDK

From `apps/api/`:

```bash
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

These two packages cover the entire feature:
- `@aws-sdk/client-s3` — `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`, `HeadObjectCommand`.
- `@aws-sdk/s3-request-presigner` — `getSignedUrl()` for browser-side PUT and signed GET downloads.

## 1.4 Shared S3 client (Nest module)

Create `apps/api/src/storage/` with:

```
storage/
├── storage.module.ts        # Global module exporting StorageService
├── storage.service.ts       # Injectable — wraps S3Client + presign helpers
└── storage.config.ts        # Reads env vars, validates them at boot
```

`storage.service.ts` exposes a minimal surface — do not let the S3 client leak across the codebase:

```typescript
@Injectable()
export class StorageService {
  presignUpload(key: string, contentType: string, maxBytes: number): Promise<string>;
  presignDownload(key: string): Promise<string>;
  delete(key: string): Promise<void>;
  head(key: string): Promise<{ size: number; contentType: string } | null>;
}
```

Endpoint for the S3 client:

```typescript
endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
region: 'auto',
forcePathStyle: false,
```

Register `StorageModule` as **global** in `app.module.ts` so any feature module (including `AttachmentsModule`) can inject `StorageService` without re-importing.

## 1.5 Boot-time validation

In `storage.config.ts`, fail fast if any of `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` are missing. Log a clear message — the rest of the feature is dead weight without these.

## Verification

- `bun run dev` starts the API without errors.
- A throwaway test (or a `GET /attachments/health` debug endpoint behind a feature flag) can call `presignUpload('test/key.txt', 'text/plain', 1024)` and return a non-empty URL.
- `curl -X PUT` against that URL with a small payload succeeds (HTTP 200) and the object appears in the R2 dashboard.

Once this step is green, move to [02-database-schema.md](02-database-schema.md).
