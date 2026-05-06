# 🏆 @bepalo/router — Router Module Documentation

## 📑 Table of Contents

- [Overview](#overview)
  - [Design Goals](#design-goals)
  - [Key Features](#key-features)
  - [Handler Pipeline](#handler-pipeline)
  - [Path Matching & Priority](#path-matching--priority)
  - [Performance & Behavior](#performance--behavior)
  - [Security & Best Practices](#security--best-practices)
  - [Compatibility](#compatibility)
- [API Reference](#api-reference)
  - [Router Class](#router-class)
    - [Constructor](#constructor)
    - [Configuration Options](#configuration-options)
    - [Handler Registration Methods](#handler-registration-methods)
    - [Handler Options](#handler-options)
    - [Context Types & Extending Context](#context-types--extending-context)
    - [Router Composition](#router-composition)
    - [Request Processing](#request-processing)
- [Examples](#examples)
  - [Router Composition Example](#router-composition-example)
  - [Helper Functions](#helper-functions)
  - [Provided Middleware](#provided-middleware)
  - [Full Example](#full-example)
  - [Serve with Client Address](#serve-with-client-address)
    - [Bun](#bun)
    - [Deno](#deno)
    - [Node.js](#nodejs)
- [License](#license)

---

## Overview

@bepalo/router is a fast, feature-rich HTTP router for modern JavaScript runtimes.

### Design goals

- Server independent routing. `Request` -(handlers)-> `Response`.
- Predictable, deterministic route matching and pipeline flow.
- Composability: small routers can be appended under prefixes.
- Low overhead and streaming-friendly to support large uploads and proxies.
- Explicit, type-safe context passing for handlers (CTX types).

### Key features

- Named params, single-segment (\*) and multi-segment (\*\*) wildcards, and globs.
- Handler pipelines with early‑termination semantics (hooks, filters, handlers, fallbacks, catchers, afters).
- Route composition via append(prefix, router).
- Built-in helpers and middleware: body/cookie parsers, uploads, CORS, rate limiting, auth helpers.
- Configurable default headers, global catcher/fallback, and normalizeTrailingSlash support.
- Works across Bun, Deno and Node with examples provided.

### Handler Pipeline

The router processes requests in this order:

1. **Hooks** (`router.hook()`): Pre-processing, responses are ignored.
2. **Filters** (`router.filter()`): Request validation/authentication, can return a Response to short-circuit.
3. **Handlers** (`router.handle()`): Main request processing, must return a Response.
4. **Fallbacks** (`router.fallback()`): When no handler matches, e.g. for 404s.
5. **Afters** (`router.after()`): Post-processing, responses are ignored.
6. **Catchers** (`router.catch()`): Error handling, receives error in context.

**Pipeline logic:**

- Handlers in a pipeline are called in order. If a handler returns a `Response`, that response is sent and the pipeline stops.
- If a handler returns `true`, the pipeline for that handler type stops, but no response is sent (useful for closest-match-only policies, e.g. rate limiters).
- If a handler returns `false` or `undefined`, the next handler in the pipeline is called.

### Path matching & priority

- Matching priority: exact paths → params / single-segment wildcards (._/ _) → multi-segment wildcards (.** / **).
- Use method-path shortcuts (ALL, CRUD) and glob patterns for concise route sets.

### Performance & behavior

- Optimized lookup for common cases and low allocation match paths.
- Streaming-friendly: handlers can forward fetch requests, stream responses, and handle upload streams.
- normalizeTrailingSlash can be enabled to treat "/path" and "/path/" as the same.

### Security & best practices

- Validate inputs in filters and sanitize forwarded paths.
- Apply rate limiting and CORS on public routes.
- Prefer parseBody({ once: true }) when you only need the body once.
- When using forward() across appended routers, avoid binding concrete router instances — bind to this when needed.

### Compatibility

- Examples and adapters for Bun, Deno and Node included.
- TypeScript generics supported for typed request context.

### Handler Types

| Handler Type | Method              | Purpose                                   | Can End Pipeline? |
| ------------ | ------------------- | ----------------------------------------- | ----------------- |
| Hook         | `router.hook()`     | Pre-processing, cannot return Response    | No                |
| Filter       | `router.filter()`   | Validation/auth, can return Response      | Yes               |
| Handler      | `router.handle()`   | Main handler, must return Response        | Yes               |
| Fallback     | `router.fallback()` | 404/No match handler                      | Yes               |
| After        | `router.after()`    | Post-processing, cannot return Response   | No                |
| Catcher      | `router.catch()`    | Error handling, receives error in context | Yes               |

---

#### Example: Handler Pipeline

```ts
import { Router, type CTXBody, parseBody, json, text } from "@bepalo/router";

type CTXPostUsers = CTXBody & { body: { email: string } };

const router = new Router();

// Filter pipeline
router.filter<CTXPostUsers>("POST /api/users", [
  parseBody({ once: true }), // Always use once:true for POST/PUT/PATCH
  (req, ctx) => {
    if (!ctx.body.email) return text("Email is required", { status: 400 });
  },
]);

// Handler pipeline
router.handle<CTXPostUsers>("POST /api/users", [
  async (req, ctx) => {
    // ...create user logic...
    return json({ created: true }, { status: 201 });
  },
]);
```

```js
// for type safety
type CTXPostUsers = CTXBody & { body: { email: string } };

// The filter pipeline
router.filter<CTXPostUsers>("POST /api/users", [
  // Middleware 1: Parse body. just for demonistration.
  // use the provided parseBody() middleware or your own.
  async (req, ctx) => {
    const body = await req.json();
    ctx.body = body;
  },

  // Middleware 2: Validate
  (req, ctx) => {
    if (!ctx.body.email) {
      return text("Email is required", { status: 400 });
    }
  },
]);

// The handler pipeline
router.handle<CTXPostUsers>("POST /api/users", [
  // Handler: Process request
  async (req, ctx) => {
    const user = await db.users.create(ctx.body);
    return json(user, { status: 201 });
  },
]);
```

---

### Path Patterns

```ts
// Named parameters
router.handle("GET /users/:id", handler); // Matches: /users/123

// Single segment wildcard
router.handle("GET /files/*", handler); // Matches: /files/a, /files/b

// Single segment wildcard including current path (must be at end)
router.handle("GET /files/.*", handler); // Matches: /files, /files/a, /files/b

// Multi-segment wildcard (must be at end)
router.handle("GET /docs/**", handler); // Matches: /docs/a, /docs/a/b/c

// Multi-segment wildcard including current path (must be at end)
router.handle("GET /docs/.**", handler); // Matches: /docs, /docs/a, /docs/a/b/c

// Mixed patterns
router.handle("GET /api/:version/*/details", handler); // /api/v1/users/details

// All methods shortcut
router.handle("ALL /path", handler); // HEAD|OPTIONS|GET|POST|etc /path

// CRUD methods shortcut
router.handle("CRUD /path", handler); // GET|POST|PUT|PATCH|DELETE /path

// Global All method-paths
router.handle("*", handler); // GET|POST|PUT|etc /.**
```

---

### Route Priority

Routes are matched in this order of priority:

1. Exact path matches
2. Path parameters (`:id`) and single segment wildcards (`*`, `.*`)
3. Multi-segment wildcards (`**`, `.**`)

---

## API Reference

### Router Class

#### Constructor

```ts
new Router<Context>(config?: RouterConfig<Context>)
```

#### Configuration Options:

```ts
interface RouterConfig<Context extends RouterContext> {
  defaultHeaders?:
    | Array<[string, string]> // as static default headers
    | () => Array<[string, string]> // as dynamic default headers
  ; // Default response headers
  defaultCatcher?: Handler<Context>; // Global error handler
  defaultFallback?: Handler<Context>; // Global fallback handler
  enable?: Partial<HandlerEnable>; // Handler types enable filter
  normalizeTrailingSlash?: boolean; // treat '/abc/' and '/abc' as the same
}
```

#### Handler Registration Methods

All methods support method chaining and return the router instance. However `Response` type responses from hooks and afters are ignored unlike the rest.

```ts
// Register a hook (pre-processing)
router.hook(
  urls: "*" | MethodPath | MethodPath[],
  pipeline: Handler<Context> | Pipeline<Context>,
  options?: HandlerOptions
)

// Register a filter (request validation)
router.filter(
  urls: "*" | MethodPath | MethodPath[],
  pipeline: Handler<Context> | Pipeline<Context>,
  options?: HandlerOptions
)

// Register a main handler
router.handle(
  urls: "*" | MethodPath | MethodPath[],
  pipeline: Handler<Context> | Pipeline<Context>,
  options?: HandlerOptions
)

// Register a fallback handler (404)
router.fallback(
  urls: "*" | MethodPath | MethodPath[],
  pipeline: Handler<Context> | Pipeline<Context>,
  options?: HandlerOptions
)

// Register an error catcher
router.catch(
  urls: "*" | MethodPath | MethodPath[],
  pipeline: Handler<Context> | Pipeline<Context>,
  options?: HandlerOptions
)

// Register an after handler (post-processing)
router.after(
  urls: "*" | MethodPath | MethodPath[],
  pipeline: Handler<Context> | Pipeline<Context>,
  options?: HandlerOptions
)
```

#### Handler Options:

```ts
interface HandlerOptions {
  overwrite?: boolean; // Allow overriding existing routes (default: false)
}
```

### Context Types & Extending Context

Each handler receives a context object, which you can extend for your needs:

```ts
interface RouterContext {
  url: URL;
  params: Record<string, string>; // Route parameters
  headers: Headers; // Response headers
  response?: Response; // Final response
  error?: Error; // Error (if any)
  found: {
    hooks: boolean;
    afters: boolean;
    filters: boolean;
    handlers: boolean;
    fallbacks: boolean;
    catchers: boolean;
  };
}

// Example: Extending context for authentication
type CTXAuth = { user?: { id: string } };
const router = new Router<CTXAuth>();
router.filter<CTXAuth>("GET /private", (req, ctx) => {
  ctx.user = { id: "123" };
});
```

#### Common Types

```ts
type HttpPath = `/${string}`;
type MethodPath = `${HttpMethod | "ALL" | "CRUD"} ${HttpPath}`;
type HandlerType =
  | "filter"
  | "hook"
  | "handler"
  | "fallback"
  | "catcher"
  | "after";
type HandlerResponse =
  | Response
  | void
  | boolean
  | Promise<Response | void | boolean>;
type BoundHandler<XContext = {}> = (
  this: Router<XContext>,
  req: Request,
  ctx: RouterContext<XContext>,
) => HandlerResponse;
type FreeHandler<XContext = {}> = (
  req: Request,
  ctx: RouterContext<XContext>,
) => HandlerResponse;
type Handler<XContext = {}> = FreeHandler<XContext> | BoundHandler<XContext>;
type Pipeline<Context = {}> = Array<Handler<Context>>;
type HeaderTuple = [string, string];
interface SocketAddress {
  address: string;
  family: string;
  port: number;
}
type CTXError = { error: Error };
type CTXAddress = { address: SocketAddress };
```

#### Router Composition

```ts
// Append routes from another router with a prefix. Does NOT merge router configurations.
mainRouter.append("/api", apiRouter);
```

> **Note:** Appending does not merge configuration (e.g., default headers, catchers). Only routes are appended.

#### Request Processing

```ts
// Process a request
router.respond(req: Request, context?: Partial<Context>): Promise<Response>
```

---

## Examples

### Router Composition Example

```js
// User API routes
const userAPIRouter = new Router();
userAPIRouter.handle("GET /", () => json({ user: {} }));
userAPIRouter.handle <
  CTXBody >
  ("POST /",
  [
    parseBody(),
    async (req, { body }) => {
      return json({ success: true, data: body }, { status: 201 });
    },
  ]);

// Session API routes
const sessionAPIRouter = new Router();
sessionAPIRouter.handle("GET /", () => json({ session: {} }));
sessionAPIRouter.handle("POST /", [
  parseBody(),
  async (req, { body }) => {
    return json({ success: true, data: body }, { status: 201 });
  },
]);

// API v1 router
const v1APIRouter = new Router();
v1APIRouter.handle("GET /status", () => json({ version: "1.0", status: "ok" }));

// Composition is useful for defining routes in multiple files
//  and appending them in other routes.
v1APIRouter.append("/user", userAPIRouter);
v1APIRouter.append("/session", sessionAPIRouter);

const mainRouter = new Router();
mainRouter.append("/api/v1", v1APIRouter);
```

---

#### Helper Functions

```ts
import {
  Status,
  status,
  redirect,
  forward,
  text,
  html,
  json,
  blob,
  octetStream,
  formData,
  usp,
  send,
  setCookie,
  clearCookie,
  type CTXCookie,
  parseCookie,
  type CTXBody,
  parseBody,
  type CTXUpload,
  parseUploadStreaming,
} from "@bepalo/router";

const router = new Router();

// Usage examples
router.handle("GET /text", () => text("Hello World"));
router.handle("GET /html", () => html("<h1>Title</h1>"));
router.handle("GET /json", () => json({ data: "value" }));
router.handle("GET /status", () => status(Status._204_NoContent, null)); // No Content
// ...

router.handle("GET /new-location", () => html("GET new-location"));
// router.handle("POST /new-location", () => html("POST new-location"));
router.handle<CTXBody>("POST /new-location", [
  parseBody({ once: true, clone: true }),
  (req, { body }) => console.log(body),
  forward("/new-location2"),
]);
router.handle<CTXBody>("POST /new-location2", [
  parseBody({ once: true, clone: false }),
  (req, { body }) => console.log(body),
  () => html("POST new-location2"),
]);
router.handle("GET /redirected", () => redirect("/new-location"));
router.handle("GET /forwarded", forward("/new-location"));
// this would set the headers:
// "x-forwarded-path": "/forwarded"
// "x-original-path": "/forwarded"
router.handle<CTXBody>("PUT /forwarded-with-new-method", [
  parseBody({ once: true, clone: true }),
  (req, { body }) => console.log(body),
  forward("/new-location", { method: "POST" }),
]);
// this would set the headers:
// "x-forwarded-method": "PUT"
// "x-forwarded-path": "/new-location"
// "x-original-path": "/forwarded-with-new-method"
router.handle("GET /forwarded-conditional", function (this: Router, req, ctx) {
  if (req.headers.get("authorization"))
    return forward("/new-location").bind(this)(req, ctx);
  // or return forward("/new-location").apply(this, [req, ctx]);
  // NOTE: be careful when binding instance `router` instead of `this`
  //   as it might be called from a different router due to append.
  return status(Status._401_Unauthorized);
});

router.handle<CTXCookie>("GET /cookie", [
  parseCookie(),
  (req, { cookie }) => json({ cookie }),
]);

router.handle<CTXBody>("POST /cookie", [
  parseBody(),
  (req, { body }) => {
    return status(Status._200_OK, "OK", {
      // or `, undefined, {` and the status text will be set
      headers: [
        ...Object.entries(body).map(([name, value]) =>
          setCookie(name, String(value), {
            path: "/",
            expires: Time.after(5).minutes.fromNow()._ms,
          }),
        ),
      ],
    });
  },
]);

router.handle("DELETE /cookie/:name", [
  (req, ctx) =>
    status(Status._200_OK, undefined, {
      headers: [clearCookie(ctx.params.name, { path: "/" })],
    }),
]);

// be sure to create ./upload folder for this example
router.handle<CTXUpload>("POST /upload", [
  (req, ctx) => {
    let file: Bun.BunFile;
    let fileWriter: Bun.FileSink;
    return parseUploadStreaming({
      allowedTypes: ["image/jpeg"],
      maxFileSize: 5 * 1024 * 1024,
      maxTotalSize: 5 * 1024 * 1024 + 1024,
      maxFields: 1,
      maxFiles: 1,
      // uploadIdGenerator: () =>
      //   `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      async onUploadStart(uploadId, totalSize) {
        console.log("onUploadStart", { uploadId, totalSize });
      },
      async onError(uploadId, error) {
        console.error("onError", uploadId, error);
      },
      async onFileError(uploadId, fieldName, fileName, error) {
        console.error("onFileError", uploadId, error);
      },
      async onField(uploadId, fieldName, value) {
        console.log("onField", { uploadId, fieldName, value });
      },
      async onFileStart(uploadId, fieldName, fileName, contentType) {
        console.log("onFileStart", {
          uploadId,
          fieldName,
          fileName,
          contentType,
        });
        const ext = fileName.substring(fileName.lastIndexOf("."));
        const customFilename = uploadId + ext;
        file = Bun.file("./uploads/" + customFilename);
        fileWriter = file.writer();
        return {
          customFilename,
          // metadata
        };
      },
      async onFileChunk(uploadId, fieldName, fileName, chunk, offset, isLast) {
        const chunkSize = chunk.byteLength;
        console.log("onFileChunk", { uploadId, chunkSize, offset, isLast });
        fileWriter.write(chunk);
      },
      async onFileComplete(
        uploadId,
        fieldName,
        fileName,
        fileSize,
        customFilename,
        metadata,
      ) {
        console.log("onFileComplete", {
          uploadId,
          fieldName,
          fileName,
          fileSize,
          customFilename,
          metadata,
        });
        if (fileWriter) {
          fileWriter.end();
        }
      },
      async onUploadComplete(uploadId, success) {
        console.log("onUploadComplete", { uploadId, success });
      },
    })(req, ctx);
  },
  (req, { uploadId, fields, files }) => {
    console.log({ uploadId, fields, files });
    return status(Status._200_OK);
  },
]);
```

---

#### Provided Middleware

```ts
import {
  parseQuery,
  parseCookie,
  parseBody,
  parseUploadStreaming,
  cors,
  limitRate,
  authenticate,
  authorize,
  authBasic,
  authAPIKey,
  authJWT,
  type CTXQuery,
  type CTXCookie,
  type CTXBody,
  type CTXAuth,
  type CTXUpload,
} from "@bepalo/router";
```

### Full Example

```ts
import {
  Router,
  status,
  html,
  json,
  cors,
  limitRate,
  parseBody,
  type CTXBody,
  type CTXAddress,
  type SocketAddress,
} from "@bepalo/router";
import { z } from "zod";

const router = new Router<CTXAddress>({
  defaultHeaders: () => [
    ["X-Powered-By", "@bepalo/router"],
    ["Date", new Date().toUTCString()],
  ],
  defaultCatcher: (req, ctx) => {
    console.error("Error:", ctx.error);
    return json({ error: "Something went wrong" }, { status: 500 });
  },
  enable: {
    hooks: false,
    afters: false,
    filters: true,
    fallbacks: true,
    catchers: true,
  },
});

// Global rate-limit and CORS
router.filter("ALL /.**", [
  limitRate({
    key: (req, ctx) => ctx.address.address,
    maxTokens: 30,
    refillRate: 3,
    setXRateLimitHeaders: true,
  }),
  cors({ origins: "*", methods: ["GET"] }),
]);

// Rate limiting for API
router.filter("CRUD /api/.**", [
  limitRate({
    key: (req, ctx) => ctx.address.address,
    maxTokens: 100,
    refillInterval: 30_000,
    refillRate: 50,
    setXRateLimitHeaders: true,
  }),
  cors({
    origins: ["http://localhost:3000", "https://example.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    endHere: true,
  }),
]);

router.handle("GET /", () =>
  html("<h1>Welcome! Enjoy using @bepalo/router</h1>"),
);
router.handle("GET /status", () => status(200));

// trailing slash matters unless normalizeTrailingSlash option is set
router.handle("GET /res/", () => text("/res/"));
router.handle("GET /res", () => text("/res"));

// Sample sub-route `/api/user`
const userRepo = new Map();
const userAPI = new Router();
let topId = 1000;

const postUserBodySchema = z.object({
  name: z.string(),
  password: z.string().min(4),
});

userAPI.filter<CTXBody>("POST /", [
  parseBody({ once: true }),
  (req, { body }) => {
    const { success, error } = postUserBodySchema.safeParse(body);
    const errors = error?.issues ?? [];
    if (!success) return json({ errors }, { status: 400 });
  },
]);
userAPI.handle<CTXBody>("POST /", [
  (req, { body }) => {
    const id = topId++;
    const { name, password } = body;
    const user = { id, name, password };
    userRepo.set(id, user);
    return json({ success: true, id }, { status: 201 });
  },
]);

userAPI.handle("GET /", () =>
  json({ users: Object.fromEntries(userRepo.entries()) }),
);
userAPI.handle("GET /:userId", (req, { params }) => {
  const { userId } = params;
  const user = userRepo.get(parseInt(userId));
  if (!user) return json({ error: "User not found" }, { status: 404 });
  return json({ user });
});

router.append("/api/user", userAPI);

router.fallback("GET /api/.**", () =>
  json({ error: "Not found" }, { status: 404 }),
);
router.catch("CRUD /api/.**", [
  (req, ctx) => {
    console.error("APIError:", ctx.error);
    return json({ error: "Something went wrong" }, { status: 500 });
  },
]);

Bun.serve({
  port: 3000,
  async fetch(req, server) {
    const address = server.requestIP(req) as SocketAddress | null;
    if (!address) throw new Error("null client address");
    return await router.respond(req, { address });
  },
});

console.log("Server listening on http://localhost:3000");
```

### Serve with client address

#### Bun

```ts
Bun.serve({
  port: 3000,
  async fetch(req, server) {
    const address = server.requestIP(req) as SocketAddress;
    return await router.respond(req, { address });
  },
});
console.log("Server running at http://localhost:3000");
```

#### Deno

```ts
Deno.serve(
  {
    port: 3000,
    onListen: () => console.log("Server listening on http://localhost:3000"),
  },
  async (req, { remoteAddr }) => {
    const address = {
      family: remoteAddr.transport,
      address: remoteAddr.hostname,
      port: remoteAddr.port,
    } as SocketAddress;
    return router.respond(req, { address });
  },
);
```

#### Node.js

```ts
import http from "http";

http
  .createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const headers = new Headers();
    Object.entries(req.headers).forEach(
      ([k, v]) => v && headers.set(k, v.toString()),
    );
    const request = new Request(url, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req,
      duplex: "half",
    });
    const address = {
      family: req.socket.remoteFamily,
      address: req.socket.remoteAddress,
      port: req.socket.remotePort,
    };
    try {
      const response = await router.respond(request, { address });
      res.writeHead(
        response.status,
        response.statusText,
        Object.fromEntries(response.headers.entries()),
      );
      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch {
      res.writeHead(500).end();
    }
  })
  .on("connection", (socket) => socket.setNoDelay(true))
  .listen(3000, () => console.log("Server running on port 3000"));
```

---

## License

MIT © Natnael Eshetu
