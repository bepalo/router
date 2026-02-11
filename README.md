# 🏆 @bepalo/router

[![npm version](https://img.shields.io/npm/v/@bepalo/router.svg)](https://www.npmjs.com/package/@bepalo/router)
[![CI](https://img.shields.io/github/actions/workflow/status/bepalo/router/ci.yaml?label=ci)](https://github.com/bepalo/router/actions/workflows/ci.yaml)
[![tests](https://img.shields.io/github/actions/workflow/status/bepalo/router/testing.yaml?label=tests)](https://github.com/bepalo/router/actions/workflows/testing.yaml)
[![license](https://img.shields.io/npm/l/@bepalo/router.svg)](LICENSE)
![Benchmarked](https://img.shields.io/badge/benchmarked-yes-green)

[![Vitest](https://img.shields.io/badge/vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](test-result.md)

**A fast, feature-rich HTTP router for modern JavaScript runtimes.** [jump to example](#example)

## What is new in this version

Please refer to the [change-log](CHANGELOG.md).

Added `ALL` and `CRUD` shortcuts to method-path definition.

```js
router.handle("ALL /.**", ...); // HEAD|OPTIONS|GET|POST|PUT|PATCH|DELETE
router.handle("CRUD /api/.**", ...); // GET|POST|PUT|PATCH|DELETE
// instead of
router.handle(["HEAD /", "OPTIONS /", ...], ...); // "ALL /"
router.handle(["GET /api", "POST /api", ...], ...); // "CRUD /api"
```

## 📑 Table of Contents

1. [🏆 @bepalo/router](#-bepalorouter)
2. [✨ Features](#-features)
3. [🚀 Get Started](#-get-started)
   - [📥 Installation](#-installation)
   - [📦 Basic Usage](#-basic-usage)
   - [Example](#example)
   - [Serve with client address](#serve-with-client-address)
     - [Bun](#bun)
     - [Deno](#deno)
     - [Nodejs](#nodejs)
4. [📚 Core Concepts](#-core-concepts)
   - [Handler Types & Execution Order](#handler-types--execution-order)
   - [Router Context](#router-context)
5. [📖 API Reference](#-api-reference)
   - [Router Class](#router-class)
     - [Constructor](#constructor)
     - [Configuration Options](#configuration-options)
     - [Handler Registration Methods](#handler-registration-methods)
     - [Handler Options](#handler-options)
     - [Router Composition](#router-composition)
     - [Request Processing](#request-processing)
     - [Helper Functions](#helper-functions)
     - [Provided Middleware](#provided-middleware)
   - [🔧 Advanced Usage](#-advanced-usage)
     - [Pipeline (Multiple Handlers)](#pipeline-multiple-handlers)
     - [Path Patterns](#path-patterns)
     - [Route Priority](#route-priority)
     - [Router Composition Example](#router-composition-example)
6. [🎯 Performance](#-performance)
   - [Comparison with Other Routers](#comparison-with-other-routers)
7. [📄 License](#-license)
8. [🕊️ Thanks and Enjoy](#-thanks-and-enjoy)
9. [💖 Be a Sponsor](#-be-a-sponsor)

## ✨ Features

- ⚡ **High Performance** - Built on a radix tree for O(k) route matching (where k is path length)
- 🎯 **Flexible Routing Engine** - Support for path parameters, wildcards (`*`, `.*`, `**`, `.**`), and all HTTP methods
- 🎭 **Multiple Handler Types** - Filters, hooks, afters, handlers, fallbacks, and catchers
- 🔌 **Middleware Pipeline** - Chain multiple handlers with early exit capability
- 🛡️ **Error Handling** - Built-in error catching with contextual error handlers
- 🔄 **Method-Based Routing** - Separate routing trees for each HTTP method
- 📦 **Local Dependencies** - Minimal Dependencies — Only internal @bepalo packages
- 🌐 **Runtime Agnostic** - Works with Bun, Deno, Node.js, and other runtimes
- 🔧 **TypeScript Ready** - Full type definitions included
- 🧩 **Composable Router Architecture** - Append one router to another with a path prefix.
- 🛠️ **Built-in Helper Utilities** - Built-in response helpers (json, html, parseBody, upload, etc.)
- 🔐 **Middleware Integration** - CORS, rate limiting, authentication helpers

## 🚀 Get Started

### 📥 Installation

**Node.js / Bun (npm / pnpm / yarn)**

```sh
bun add @bepalo/router
# or
pnpm add @bepalo/router
# or
npm install @bepalo/router
# or
yarn add @bepalo/router
```

**Deno**

```ts
// Import directly using the URL:

import { Router } from "npm:@bepalo/router";
// or
import { Router } from "jsr:@bepalo/router";
```

## 📦 Basic Usage

```js
import {
  Router,
  text,
  json,
  type CTXBody,
  parseBody,
  type CTXUpload,
  parseUploadStreaming,
} from "@bepalo/router";
// } from "jsr:@bepalo/router"; // for deno

// Create a router instance
const router = new Router();

// Simple GET route
router.handle("GET /", () => text("Hello World!"));

// Route with parameters
router.handle("GET /users/:id", (req, ctx) => json({ userId: ctx.params.id }));

// POST route with JSON response
router.handle("POST /users", async (req) => {
  const body = await req.json();
  return json({ created: true, data: body }, { status: 201 });
});

// 404 fallback
router.fallback("*", () => status(404));

// Error handler
router.catch("*", (req, ctx) => {
  console.error("Error:", ctx.error);
  return status(500, "Something Went Wrong");
});

// Start server (Bun example)
Bun.serve({
  port: 3000,
  fetch: (req) => router.respond(req),
});

// Start server (Deno example)
Deno.serve(
  {
    port: 3000,
    onListen: () => console.log("Server listening on http://localhost:3000"),
  },
  router.respond.bind(router),
);

console.log("Server running at http://localhost:3000");
```

### Example

```js
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
  // Default headers can accept static headers or dynamic headers
  //   as a function like this
  defaultHeaders: () => [
    ["X-Powered-By", "@bepalo/router"],
    ["Date", new Date().toUTCString()],
  ],
  // Errors are caught by defualt but not logged
  defaultCatcher: (req, ctx) => {
    console.error("Error:", ctx.error);
    return json({ error: "Something went wrong" }, { status: 500 });
  },
  // For crude optimizations
  enable: {
    hooks: false,
    afters: false,
    filters: true,
    fallbacks: true,
    catchers: true,
  },
  ///...
});

// Global rate-limit and CORS
router.filter("ALL /.**", [
  limitRate({
    key: (req, ctx) => ctx.address.address, // used to identify client
    maxTokens: 30,
    refillRate: 3, // 3 tokens every second
    setXRateLimitHeaders: true,
  }),
  cors({
    origins: "*",
    methods: ["GET"],
  }),
]);

// Rate limiting for API
router.filter("CRUD /api/.**",[
  limitRate({
    key: (req, ctx) => ctx.address.address, // used to identify client
    maxTokens: 100,
    refillInterval: 30_000, // every 30 seconds
    refillRate: 50, // 50 tokens every refillInterval
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

// Main route
router.handle("GET /", () =>
  html("<h1>Welcome! Enjoy using @bepalo/router</h1>"),
);
router.handle("GET /status", () => status(200));

// Sample sub-route `/api/user`
////////////////////////////////////////
// eg. inside routes/api/user.ts
const userRepo = new Map();
const userAPI = new Router();
let topId = 1000;

const postUserBodySchema = z.object({
  name: z.string(),
  password: z.string().min(4),
});

userAPI.filter<CTXBody>("POST /", [
  parseBody(),
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

////////////////////////////////////////

router.append("/api/user", userAPI);

// fallback handling
router.fallback("GET /api/.**", () =>
  json({ error: "Not found" }, { status: 404 }),
);

// Error handling
router.catch(
  [
    "GET /api/.**",
    "POST /api/.**",
    "PUT /api/.**",
    "PATCH /api/.**",
    "DELETE /api/.**",
  ],
  [
    (req, ctx) => {
      console.error("APIError:", ctx.error);
      return json({ error: "Something went wrong" }, { status: 500 });
    },
  ],
);

// Start server
Bun.serve({
  port: 3000,
  async fetch(req, server) {
    const address = server.requestIP(req) as SocketAddress | null;
    if (!address) throw new Error("null client address");
    /// best to log request and response here...
    return await router.respond(req, { address });
  },
});

console.log("Server listening on http://localhost:3000");
```

### Serve with client address

#### Bun

```js
// Bun example
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

```js
// Deno example
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
  // router.respond.bind(router),
);
```

#### Nodejs

```js
// Node.js compatibility example (uses Fetch bridge; not optimized)
http
  .createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    // Build fetch request
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

## 📚 Core Concepts

### Handler Types & Execution Order

The router processes requests in this specific order:

    1. Hooks (router.hook()) - Pre-processing, responses are ignored

    2. Filters (router.filter()) - Request validation/authentication

    3. Handlers (router.handle()) - Main request processing

    4. Fallbacks (router.fallback()) - When no handler matches

    5. Afters (router.after()) - Post-processing, responses are ignored

    6. Catchers (router.catch()) - Error handling

### Router Context

Each handler receives a context object with:

```ts
interface RouterContext {
  params: Record<string, string>; // Route parameters
  headers: Headers; // Response headers
  address?: SocketAddress | null; // Client address
  response?: Response; // Final response
  error?: Error; // Caught error
  found: {
    hooks: boolean; // Whether hooks were found
    afters: boolean; // Whether afters were found
    filters: boolean; // Whether filters were found
    handlers: boolean; // Whether handlers were found
    fallbacks: boolean; // Whether fallbacks were found
    catchers: boolean; // Whether catchers were found
  };
}
```

## 📖 API Reference

### Router Class

#### Constructor

```ts
new Router<Context>(config?: RouterConfig<Context>)
```

#### Configuration Options:

```ts
interface RouterConfig<Context extends RouterContext> {
  defaultHeaders?: Array<[string, string]>; // Default response headers
  defaultCatcher?: Handler<Context>; // Global error handler
  defaultFallback?: Handler<Context>; // Global fallback handler
  enable?: HandlerEnable; // Handler types enable/disable
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

#### Router Composition

```ts
// Append another router with a prefix
router.append(
  baseUrl: `/${string}`,
  router: Router<Context>,
  options?: HandlerOptions
)
```

#### Request Processing

```ts
// Process a request
router.respond(
  req: Request,
  context?: Partial<Context>
): Promise<Response>
```

#### Helper Functions

```ts
import {
  Status, // Status enum
  status, // HTTP status response
  redirect, // Redirect response with location header set
  forward, // forward to other path within the router.
  text, // Plain text response
  html, // HTML response
  json, // JSON response
  blob, // Blob response
  octetStream, // Octet-stream response
  formData, // FormData response
  usp, // URLSearchParams response
  send, // Smart response (auto-detects content type)
  setCookie, // Set cookie header
  clearCookie, // Clear cookie
  type CTXCookie,
  parseCookie, // Cookie parser
  type CTXBody,
  parseBody, // Body parser
  type CTXUpload,
  parseUploadStreaming, // multi-part-form-data and file upload stream parser
} from "@bepalo/router";

const router = new Router();

// Usage examples
router.handle("GET /text", () => text("Hello World"));
router.handle("GET /html", () => html("<h1>Title</h1>"));
router.handle("GET /json", () => json({ data: "value" }));
router.handle("GET /status", () => status(Status._204_NoContent, null)); // No Content
router.handle("GET /intro.mp4", () => blob(Bun.file("./intro.mp4")));
router.handle("GET /download", () => octetStream(Bun.file("./intro.mp4")));

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

#### Provided Middleware

```ts
import {
  type CTXCookie,
  type CTXBody,
  type CTXAuth,
  type CTXUpload,
  parseCookie, // Cookie parser
  parseBody, // Body parser
  parseUploadStreaming, // multi-part-form-data and file upload stream parser
  cors, // CORS middleware
  limitRate, // Rate limiting
  authenticate, // Generic authentication middleware
  authorize, // Generic authorization middleware
  authBasic, // Basic authentication
  authAPIKey, // API key authentication
  authJWT, // JWT authentication
} from "@bepalo/router";
```

### 🔧 Advanced Usage

#### Pipeline (Multiple Handlers)

```js
router.handle("POST /api/users", [
  // Middleware 1: Parse body
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

  // Handler: Process request
  async (req, ctx) => {
    const user = await db.users.create(ctx.body);
    return json(user, { status: 201 });
  },
]);
```

### Path Patterns

```js
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

// All method-paths
router.handle("*", handler); // GET/POST/PUT/etc /.**
```

### Route Priority

Routes are matched in this order of priority:

    1. Exact path matches

    2. Path parameters (:id) and Single segment wildcards (*, .*)

    3. Multi-segment wildcards (**, .**)

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

## 🎯 Performance

The router uses a radix tree (trie) data structure for route matching, providing:

    O(k) lookup time where k is the path length

    Minimal memory usage - shared prefixes are stored only once

    Fast parameter extraction - no regex matching overhead

    Efficient wildcard matching - optimized tree traversal

### 📋 Comparison with Other Routers

| Feature                         | @bepalo/router | Express | Hono | Fastify |
| ------------------------------- | -------------- | ------- | ---- | ------- |
| Radix Tree Routing              | ✅             | ❌      | ✅   | ✅      |
| Few Dependencies                | ✅             | ❌      | ⚠️   | ⚠️      |
| TypeScript Native               | ✅             | ❌      | ✅   | ✅      |
| Extended Handler Phases         | ✅             | ❌      | ❌   | ⚠️      |
| Built-in Middleware             | ✅             | ⚠️      | ✅   | ✅      |
| Runtime Agnostic                | ✅             | ❌      | ✅   | ⚠️      |
| Router Composition              | ✅             | ✅      | ✅   | ✅      |
| Structured Multi-Phase Pipeline | ✅             | ❌      | ❌   | ❌      |
| Server                          | ❌             | ✅      | ⚠️   | ✅      |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](/LICENSE) file for details.

## 🕊️ Thanks and Enjoy

If you like this library and want to support then please give a star on [GitHub](https://github.com/bepalo/router).

## 💖 Be a Sponsor

Fund me so I can give more attention to the products and services you liked.

<p align="left">
  <a href="https://ko-fi.com/natieshzed" target="_blank">
    <img height="32" src="https://img.shields.io/badge/Ko--fi-donate-orange?style=for-the-badge&logo=ko-fi&logoColor=white" alt="Ko-fi Badge"> 
  </a>
</p>
