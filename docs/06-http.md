# @seedcli/http — HTTP Client

> Simple HTTP client + OpenAPI-typed client for end-to-end type-safe API calls.

**Package**: `@seedcli/http`
**Phase**: 2 (Seed Complete)
**Dependencies**: `openapi-fetch` (optional peer dependency for OpenAPI mode)

---

## Overview

Two modes:
1. **Simple mode** — Thin wrapper over Bun's native `fetch()` with convenience methods (get, post, put, delete), response typing, and file downloads
2. **OpenAPI mode** — Integration with `openapi-fetch` for projects that have an OpenAPI schema, providing full end-to-end type safety

---

## File Structure

```
packages/http/
├── package.json
├── src/
│   ├── index.ts          # Public API
│   ├── client.ts         # Simple HTTP client (Bun fetch wrapper)
│   ├── openapi.ts        # OpenAPI-typed client wrapper (openapi-fetch)
│   ├── download.ts       # File download with progress
│   └── types.ts          # Shared types
└── tests/
    ├── client.test.ts
    ├── openapi.test.ts
    └── download.test.ts
```

---

## Mode 1: Simple HTTP Client

### API

```ts
interface HttpModule {
  // Convenience methods
  get<T = unknown>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>;
  post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HttpResponse<T>>;
  put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HttpResponse<T>>;
  patch<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HttpResponse<T>>;
  delete<T = unknown>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>;
  head(url: string, options?: RequestOptions): Promise<HttpResponse<void>>;

  // Client factory
  create(config: ClientConfig): HttpClient;

  // File download
  download(url: string, dest: string, options?: DownloadOptions): Promise<void>;
}

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number>;  // Query string params
  timeout?: number;                           // Request timeout in ms
  retry?: number | RetryConfig;               // Retry count or config
  signal?: AbortSignal;
}

interface HttpResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  ok: boolean;
  raw: Response;            // Original Bun Response object
}
```

### Client Factory

Create pre-configured HTTP clients:

```ts
interface ClientConfig {
  baseURL: string;
  headers?: Record<string, string>;
  timeout?: number;
  retry?: number | RetryConfig;
  interceptors?: {
    request?: (config: RequestInit) => RequestInit | Promise<RequestInit>;
    response?: (response: HttpResponse<unknown>) => HttpResponse<unknown>;
  };
}

interface RetryConfig {
  count: number;            // Max retry attempts
  delay: number;            // Base delay in ms
  backoff?: "linear" | "exponential";  // default: "exponential"
  retryOn?: number[];       // HTTP status codes to retry on (default: [408, 429, 500, 502, 503, 504])
}
```

```ts
const api = http.create({
  baseURL: "https://api.example.com/v1",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  timeout: 10000,
  retry: { count: 3, delay: 1000, backoff: "exponential" },
});

const users = await api.get<User[]>("/users");
const user = await api.post<User>("/users", { name: "John" });
```

### File Download with Progress

```ts
interface DownloadOptions {
  headers?: Record<string, string>;
  onProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
}

interface DownloadProgress {
  percent: number;          // 0-100
  transferred: number;      // Bytes transferred
  total: number | null;     // Total bytes (null if unknown)
  speed: number;            // Bytes per second
}

await http.download(
  "https://example.com/large-file.zip",
  "./downloads/file.zip",
  {
    onProgress: ({ percent, speed }) => {
      bar.update(percent);
      // "Downloading: 45% (2.3 MB/s)"
    },
  },
);
```

### Seed Import Names

When importing HTTP functions from `@seedcli/seed`, the standalone methods are prefixed to avoid name collisions with other modules (e.g., `patching.patch`):

| `@seedcli/http` | `@seedcli/seed` |
|---|---|
| `get()` | `httpGet()` |
| `post()` | `httpPost()` |
| `put()` | `httpPut()` |
| `patch()` | `httpPatch()` |
| `head()` | `httpHead()` |

The `create()`, `download()`, and `createOpenAPIClient()` functions keep their original names.

---

## Mode 2: OpenAPI-Typed Client

### Setup

Requires two steps:
1. Generate types from OpenAPI spec using `openapi-typescript`
2. Create a typed client

```bash
# Step 1: Generate types (one-time or in build script)
bunx openapi-typescript https://api.example.com/openapi.json -o src/api-schema.ts
```

```ts
// Step 2: Create typed client
import { createOpenAPIClient } from "@seedcli/http";
import type { paths } from "./api-schema";

const client = createOpenAPIClient<paths>({
  baseUrl: "https://api.example.com",
  headers: { Authorization: `Bearer ${token}` },
});
```

### Usage

```ts
// GET — path params, query params, and response are all typed
const { data, error } = await client.GET("/users/{id}", {
  params: {
    path: { id: "123" },
    query: { include: "posts" },
  },
});

if (error) {
  // error is typed as the OpenAPI error schema
  console.error(error.message);
  return;
}

// data is typed as the OpenAPI 2xx response schema
console.log(data.name);

// POST — request body is typed
const { data: newUser } = await client.POST("/users", {
  body: {
    name: "Alice",
    email: "alice@example.com",
  },
});

// PUT
await client.PUT("/users/{id}", {
  params: { path: { id: "123" } },
  body: { name: "Updated Name" },
});

// DELETE
await client.DELETE("/users/{id}", {
  params: { path: { id: "123" } },
});
```

### Why openapi-fetch?

- **6kb** bundle size (vs 367kb for full codegen solutions)
- **300k ops/s** — fastest in benchmarks
- Uses native `fetch` — perfect for Bun
- No runtime codegen — types are compile-time only
- Battle-tested in production

---

## Error Handling

### Simple Mode

```ts
class HttpError extends Error {
  status: number;
  statusText: string;
  body: unknown;
  url?: string;
  // "HTTP 404 for https://api.example.com/users/999: Not Found"
}

class HttpTimeoutError extends Error {
  url: string;
  timeout: number;
  // "Request timed out after 10000ms: GET https://api.example.com/slow"
}
```

### OpenAPI Mode

Returns `{ data, error }` discriminated union — no exceptions by default:

```ts
const { data, error, response } = await client.GET("/users/{id}", { ... });

if (error) {
  // Typed error from OpenAPI spec
  // error.status, error.message, etc.
}
```
