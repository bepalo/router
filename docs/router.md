# 🏆 @bepalo/router - Router Module Documentation

## 📑 Table of Contents

- [Overview](#overview)
  - [Design goals](#design-goals)
  - [Key features](#key-features)
  - [Pipeline (summary)](#pipeline-summary)
  - [Path matching & priority](#path-matching--priority)
  - [Performance & behavior](#performance--behavior)
  - [Security & best practices](#security--best-practices)
  - [Compatibility](#compatibility)
  - [Handler Types](#handler-types)
  - [Pipeline](#pipeline)
  - [Path Patterns](#path-patterns)
  - [Route Priority](#route-priority)
- [API Reference](#api-reference)
  - [Router Class](#router-class)
    - [Constructor](#constructor)
    - [Configuration Options](#configuration-options)
    - [Handler Registration Methods](#handler-registration-methods)
    - [Handler Options](#handler-options)
    - [Common Types](#common-types)
    - [Router Composition](#router-composition)
    - [Request Processing](#request-processing)
- [Examples](#examples)
  - [Router Composition Example](#router-composition-example)
  - [Helper Functions](#helper-functions)
  - [Provided Middleware](#provided-middleware)
  - [Full Example](#full-example)
  - [Serve with client address](#serve-with-client-address)
    - [Bun](#bun)
    - [Deno](#deno)
    - [Nodejs](#nodejs)
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

### Pipeline (summary)

- Pipelines run in this general order: hooks → filters → handlers → fallbacks → catchers → afters.
- A handler that returns a Response or true ends the current pipeline; false or undefined continues it.
- Returning true stops the pipeline for that handler type without producing a Response (useful for closest-match-only policies, e.g. rate limiters).

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

The router processes requests in this specific order:

    1. Hooks (router.hook()) - Pre-processing, responses are ignored

    2. Filters (router.filter()) - Request validation/authentication

    3. Handlers (router.handle()) - Main request processing

    4. Fallbacks (router.fallback()) - When no handler matches

    5. Afters (router.after()) - Post-processing, responses are ignored

    6. Catchers (router.catch()) - Error handling

---

### Pipeline

There are multiple handler types and those handler types can have multple handlers that will be called intelligently. The logic is as follows.

- In a pipeline of a certain handler type, the handlers are called from the first to the last and the pipleine will end and return when a `Response` or `true` value is returned from the current handler.
- If a `false` value or nothing is returned from a handler then the chain will continue until the internal default handlers are reached.
- If a `true` value is returned from a handler then the chain will stop for that handler type. This means the matched globs, i.e. `/.**,/api/** for GET /api/users` will not be called. _This is useful for eg. multiple rate-limiters: you would want to use only the closest matched, i.e. `/api/** for GET /api/users`_
- When routing incoming requests exact matches will be looked up as well as glob,`.**,.*,**,*`, matches and based on the return value of the active handler the pipleline's flow will be controlled.

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

    2. Path parameters (:id) and Single segment wildcards (*, .*)

    3. Multi-segment wildcards (**, .**)

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

#### Common Types

```ts
// 'GET /', 'ALL /.**', 'CRUD /api/**'
type MethodPath = `${HttpMethod | "ALL" | "CRUD"} ${HttpPath}`;
```

#### Router Composition

```ts
// Append routes from another router with a prefix. Does not merge router configurations
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

---

#### Provided Middleware

```ts
import {
  parseQuery, // Query parser
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
  type CTXQuery,
  type CTXCookie,
  type CTXBody,
  type CTXAuth,
  type CTXUpload,
} from "@bepalo/router";
```

### Full Example

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

// trailing slash matters unless normalizeTrailingSlash option is set
router.handle("GET /res/", () => text("/res/"));
router.handle("GET /res", () => text("/res"));

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
router.catch("CRUD /api/.**", [
  (req, ctx) => {
    console.error("APIError:", ctx.error);
    return json({ error: "Something went wrong" }, { status: 500 });
  },
]);

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
// Serving using Bun
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
// Serving using Deno
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
// Serving using Node.js
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

---

## License

MIT © Natnael Eshetu
