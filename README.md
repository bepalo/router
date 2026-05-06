# 🏆 @bepalo/router

[![npm version](https://img.shields.io/npm/v/@bepalo/router.svg)](https://www.npmjs.com/package/@bepalo/router)
[![CI](https://img.shields.io/github/actions/workflow/status/bepalo/router/ci.yaml?label=ci)](https://github.com/bepalo/router/actions/workflows/ci.yaml)
[![tests](https://img.shields.io/github/actions/workflow/status/bepalo/router/testing.yaml?label=tests)](https://github.com/bepalo/router/actions/workflows/testing.yaml)
[![license](https://img.shields.io/npm/l/@bepalo/router.svg)](LICENSE)

<!-- ![Benchmarked](https://img.shields.io/badge/benchmarked-yes-green) -->

[![Vitest](https://img.shields.io/badge/vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](test-result.md)

**A fast, feature-rich HTTP router for modern JavaScript runtimes.** [jump to example](#example)

## What is new in this version

Please refer to the [change-log](CHANGELOG.md).

## Docs

### -> [Router](docs/router.md)

### -> [Router Framework](docs/router-framework.md) [new]

## ✨ Features

- ⚡ **High Performance** - Built on a radix tree for O(k) route matching (where k is path length)
- 📦 **Optional file-based framework** - extends the `Router` to load routes from files and folders.
- 🎯 **Flexible Routing Engine** - Support for path parameters, wildcards (`*`, `.*`, `**`, `.**`), and all HTTP methods
- 🎭 **Multiple Handler Types** - Filters, hooks, afters, handlers, fallbacks, and catchers
- 🔌 **Middleware Pipeline** - Chain multiple handlers with early exit capability
- 🛡️ **Error Handling** - Built-in error catching with contextual error handlers
- 🔄 **Method-Based Routing** - Separate routing trees for each HTTP method
- 📦 **Local Dependencies** - Minimal Dependencies — Only internal @bepalo packages
- 🌐 **Runtime Agnostic** - Works with Bun, Deno, Node.js, and other runtimes
- 🔧 **TypeScript Ready** - Full type definitions included
- 🧩 **Composable Router Architecture** - Append one router to another with a path prefix.
- 🛠️ **Provided Helper Utilities** - Built-in response helpers (json, html, parseBody, upload, etc.)
- 🛠️ **Provided Middleware Utilities** - CORS, rate limiting, authentication helpers
- 🔐 **Normalized pathname option** - An option to normalize pathnames.

## Design goals

- Server independent routing. `Request` -(handlers)-> `Response`.
- Predictable, deterministic route matching and pipeline flow.
- Composable: small routers can be appended under prefixes.
- Low overhead and streaming-friendly to support large uploads and proxies.
- Explicit, type-safe context passing for handlers (CTX types).

## 📑 Table of Contents

1. [🏆 @bepalo/router](#-bepalorouter)
2. [✨ Features](#-features)
3. [✨ Design goals](#design-goals)
4. [🚀 Get Started](#-get-started)
   - [📥 Installation](#-installation)
   - [📦 Basic Usage](#-basic-usage)
   - [Example](#example)
   - [Serve with client address](#serve-with-client-address)
     - [Bun](#bun)
     - [Deno](#deno)
     - [Nodejs](#nodejs)
5. [📚 Core Concepts](#-core-concepts)
   - [Handler Types & Execution Order](#handler-types--execution-order)
   - [Router Context](#router-context)
6. [📖 API Reference](#-api-reference)
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
7. [🎯 Performance](#-performance)
   - [Comparison with Other Routers](#comparison-with-other-routers)
8. [📄 License](#-license)
9. [🕊️ Thanks and Enjoy](#-thanks-and-enjoy)
10. [💖 Be a Sponsor](#-be-a-sponsor)

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
import { Router } from "jsr:@bepalo/router";
```

## 📦 Basic Usage

```js
import {
  Router,
  text,
  html,
  json,
  type CTXBody,
  parseBody,
} from "@bepalo/router";
// } from "jsr:@bepalo/router"; // for deno

// Create a router instance
const router = new Router({
  defaultHeaders: () => [
    ["X-Powered-By", "@bepalo/router"],
    ["Date", new Date().toUTCString()]
  ],
  defaultCatcher: (req, { error }) => {
    console.error("Error:", error);
    return status(500);
  }
});

// Simple GET route
router.handle("GET /", () => text("Hello World!"));

// Route with parameters
router.handle("GET /users/:id",
  (req, { params }) => json({ userId: ctx.params.id })
);

// POST route with JSON response
router.handle<CTXBody>("POST /users", [
  parseBody({ accept: ["application/json"], maxSize: 2048 }),
  async (req, { body }) => {
    return json({ created: true, data: body }, { status: 201 });
  }
]);

// Custom fallback handler
router.fallback("GET /.**",
  () => html(`<h2>404: Not Found!</h2>`, { status: 404 })
);

// Custom error handler
router.catch("ALL /api/**", (req, { error }) => {
  console.error("API Error:", error);
  return json({ error: error.message }, { status: 500 });
});

// Start server (Bun example)
Bun.serve({
  port: 3000,
  fetch: (req) => router.respond(req),
});
console.log("Server running at http://localhost:3000");

// Start server (Deno example)
Deno.serve(
  {
    port: 3000,
    onListen: () => console.log("Server listening on http://localhost:3000"),
  },
  router.respond.bind(router),
);

```

## 📚 Core Concepts

### Handler Types & Pipeline Order

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

### Router Context & TypeScript Extension

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

### Example

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
| Server                          | ⚠️             | ✅      | ⚠️   | ✅      |

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
