# 🏆 @bepalo/router

[![npm version](https://img.shields.io/npm/v/@bepalo/router.svg)](https://www.npmjs.com/package/@bepalo/router)
[![CI](https://img.shields.io/github/actions/workflow/status/bepalo/router/ci.yaml?label=ci)](https://github.com/bepalo/router/actions/workflows/ci.yaml)
[![tests](https://img.shields.io/github/actions/workflow/status/bepalo/router/testing.yaml?label=tests)](https://github.com/bepalo/router/actions/workflows/testing.yaml)
[![license](https://img.shields.io/npm/l/@bepalo/router.svg)](LICENSE)
![Benchmarked](https://img.shields.io/badge/benchmarked-yes-green)

[![Vitest](https://img.shields.io/badge/vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](test-result.md)

**A fast, feature-rich HTTP router for modern JavaScript runtimes.**

## ✨ Features

- ⚡ **High Performance** - Built on a radix tree for O(k) route matching (where k is path length)
- 🎯 **Flexible Routing** - Support for path parameters, wildcards (`*`, `.*`, `**`, `.**`), and all HTTP methods
- 🎭 **Multiple Handler Types** - Filters, hooks, handlers, fallbacks, and catchers
- 🔌 **Middleware Pipeline** - Chain multiple handlers with early exit capability
- 🛡️ **Error Handling** - Built-in error catching with contextual error handlers
- 🔄 **Method-Based Routing** - Separate routing trees for each HTTP method
- 📦 **Local Dependencies** - Only @bepalo dependencies
- 🌐 **Runtime Agnostic** - Works with Bun, Deno, Node.js, and other runtimes
- 🔧 **TypeScript Ready** - Full type definitions included
- 🧩 **Router Composition** - Append one router to another with a path prefix.
- 🛠️ **Helper Functions** - Built-in response helpers (json, html, parseBody, upload, etc.)
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

### Serve with client address

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

// Nodejs example. very slow
http.createServer(async (req, res) => {
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
}).on("connection", (socket) => socket.setNoDelay(true))
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
  status, // HTTP status response
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
router.handle("GET /status", () => status(204, null)); // No Content
router.handle("GET /intro.mp4", () => blob(Bun.file("./intro.mp4")));
router.handle("GET /download", () => octetStream(Bun.file("./intro.mp4")));

router.handle<CTXCookie>("GET /cookie", [
  parseCookie(),
  (req, { cookie }) => json({ cookie }),
]);

router.handle<CTXBody>("POST /cookie", [
  parseBody(),
  (req, { body }) => {
    return status(200, "OK", {
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
    status(200, "OK", {
      headers: [clearCookie(ctx.params.name, { path: "/" })],
    }),
]);

router.handle<CTXUpload>("POST /upload", [
  (req, ctx) => {
    let file: Bun.BunFile;
    let fileWriter: Bun.FileSink;
    return parseUploadStreaming({
      allowedTypes: ["image/jpeg"],
      async onFileStart(uploadId, fieldName, fileName, contentType, fileSize) {
        console.log(fileSize);
        const ext = fileName.substring(fileName.lastIndexOf("."));
        file = Bun.file("./uploads/" + uploadId + ext);
        fileWriter = file.writer();
      },
      async onFileChunk(uploadId, fieldName, fileName, chunk, offset, isLast) {
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
        console.log({ uploadId, fieldName, fileName, fileSize });
      },
      async onUploadComplete(uploadId, success) {
        console.log({ uploadId, success });
      },
    })(req, ctx);
  },
  (req, { uploadId, fields, files }) => {
    console.log({ uploadId, fields, files });
    console.log(files.get("profile"));
    return status(200);
  },
]);
```

#### Provided Middleware

```ts
import {
  cors, // CORS middleware
  limitRate, // Rate limiting
  authBasic, // Basic authentication
  authAPIKey, // API key authentication
  authJWT, // JWT authentication
} from "@bepalo/router/middlewares";
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
const apiRouter = new Router();

// API routes
apiRouter.handle("GET /users", () => json({ users: [] }));
apiRouter.handle("POST /users", async (req) => {
  const body = await req.json();
  return json({ created: true, data: body }, { status: 201 });
});

// Nested router
const v1Router = new Router();
v1Router.handle("GET /status", () => json({ version: "1.0", status: "ok" }));
apiRouter.append("/v1", v1Router);

// Mount API router under /api
const mainRouter = new Router();
mainRouter.append("/api", apiRouter);

// Add some frontend routes
mainRouter.handle("GET /", () => html("<h1>Home</h1>"));
mainRouter.handle("GET /about", () => html("<h1>About</h1>"));
```

### Complete Example with Middleware

```js
import {
  Router,
  text,
  json,
  cors,
  limitRate,
  type CTXAddress,
  type SocketAddress,
  type RouterContext,
} from "@bepalo/router";

const router = new Router<RouterContext & CTXAddress>({
  defaultHeaders: () => [
    ["X-Powered-By", "@bepalo/router"],
    ["Date", new Date().toUTCString()]
  ],
});

// Global CORS
router.filter("*", [
  cors({
    origins: ["http://localhost:3000", "https://example.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
]);

// Rate limiting for API
router.filter(
  [
    "GET /api/.**",
    "POST /api/.**",
    "PUT /api/.**",
    "PATCH /api/.**",
    "DELETE /api/.**",
  ],
  [
    limitRate({
      key: (req, ctx) => ctx.address.address,
      maxTokens: 100,
      refillRate: 10, // 10 tokens per second
      setXRateLimitHeaders: true,
    }),
]);

// Routes
router.handle("GET /", () => text("Welcome to the API"));

// users API `/api/users` router
{
  const usersAPI = new Router();

  usersAPI.handle("POST /", async (req) => {
    const body = await req.json();
    return json({ id: Date.now(), ...body }, { status: 201 });
  });

  usersAPI.handle("GET /", () =>
    json({
      users: [
        { id: 1, name: "Abebe" },
        { id: 2, name: "Derartu" },
      ],
    }),
  );

  usersAPI.handle("GET /:id", (req, { params }) =>
    json({ user: { id: params.id, name: "User " + params.id } }),
  );

  router.append("/api/users", usersAPI);
}

// Custom Error handling
router.catch("*", (req, ctx) => {
  console.error("Error:", ctx.error);
  return json({ error: "Internal server error" }, { status: 500 });
});

// Custom fallback handler
router.fallback("*", () => json({ error: "Not found" }, { status: 404 }));

// Start server
Bun.serve({
  port: 3000,
  async fetch(req, server) {
    const address = server.requestIP(req) as SocketAddress | null;
    if(!address) {
      throw new Error("null client address");
    }
    return await router.respond(req, { address });
  },
});

console.log("Server listening on http://localhost:3000");

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
| Zero Dependencies               | ✅             | ❌      | ❌   | ❌      |
| TypeScript Native               | ✅             | ❌      | ✅   | ✅      |
| Extended Handler Phases         | ✅             | ⚠️      | ⚠️   | ⚠️      |
| Built-in Middleware             | ✅             | ❌      | ✅   | ✅      |
| Runtime Agnostic                | ✅             | ❌      | ✅   | ❌      |
| Router Composition              | ✅             | ✅      | ✅   | ✅      |
| Structured Multi-Phase Pipeline | ✅             | ❌      | ❌   | ❌      |

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
