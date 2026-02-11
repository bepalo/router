# 🏆 @bepalo/router - Framework Module Documentation

## 📑 Table of Contents

1. [Overview](#overview)
2. [File System Routing](#file-system-routing)
3. [Route File Conventions](#route-file-conventions)
4. [Handler Definitions](#handler-definitions)
5. [Path Parameter Syntax](#path-parameter-syntax)
6. [RouterFramework Class](#routerframework-class)
7. [Configuration Options](#configuration-options)
8. [API Reference](#api-reference)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)
11. [License](#license)

---

## Overview

The `RouterFramework` extends the base `Router` class to provide **file-system based routing**. It automatically discovers and registers routes from your filesystem, mapping file paths to URL patterns.

```typescript
import { RouterFramework } from "@bepalo/router";

const app = new RouterFramework({
  rootPath: "./routes",
});

// Auto-discovers and registers all routes
// The root path will be traversed and each node will be filtered and processed before being imported and registered into the router with the defined methods and handler types.
// By default loaded file extensions are `.js`, `.ts`, `.jsx` and `.tsx`
await app.load();
```

---

## File System Routing

### Directory Structure → URL Mapping

```
routes/
├── index.ts                        → /
├── users
│   ├── index.ts                    → /users
│   ├── [id].ts                     → /users/:id
│   ├── profile.ts                  → /users/profile
│   └── settings
│       └── index.ts                → /users/settings
├── api
│   ├── ($$).ts                     → /api/** (all routes under /api)
│   └── v1/
│       ├── user/
│       │   ├── index.ts            → /api/v1/user
│       │   ├── [userId]
│       │       |──index.ts         → /api/v1/user/:userId
│       │       ├── post/
│       │       │   └── index.ts    → /api/v1/user/:userId/post
│       |       └── [postId].ts     → /api/v1/user/:userId/post/:postId
|
└── [$$].ts                         → /** (all routes under / including /)
```

---

## Route File Conventions

### Special File Names

| Filename        | URL Pattern        | Description                          |
| --------------- | ------------------ | ------------------------------------ |
| `index.ts`      | `/parent/path`     | Root route for directory             |
| `[id].ts`       | `/parent/path/:id` | Parameter route                      |
| `[id]/index.ts` | `/parent/path/:id` | Parameter route with nested handlers |
| `[$$].ts`       | `/parent/path/.**` | Super-glob including current path    |
| `($$).ts`       | `/parent/path/**`  | Super-glob excluding current path    |
| `[$].ts`        | `/parent/path/.*`  | Wildcard including current path      |
| `($).ts`        | `/parent/path/*`   | Wildcard excluding current path      |

### URL Pattern Examples

| File Path               | Generated URL Pattern |
| ----------------------- | --------------------- |
| `routes/index.ts`       | `/`                   |
| `routes/users/index.ts` | `/users`              |
| `routes/users/[id].ts`  | `/users/:id`          |
| `routes/api/[$$].ts`    | `/api/.**`            |
| `routes/docs/($$).ts`   | `/docs/**`            |
| `routes/assets/[$].ts`  | `/assets/.*`          |
| `routes/assets/($).ts`  | `/assets/*`           |

---

## Handler Definitions

Each route file must export a **default object** conforming to `RouterHandlers` type:

```typescript
import type { CTXBody, CTXAuth } from "@bepalo/router";
import { limitRate, cors, authenticate } from "@bepalo/router";

type CTXCommon = {};

export default {
  GET: {
    HANDLER: (req, ctx) => new Response("Hello"),
    FILTER: [limitRate({...}), cors({...}), authenticate({...})],
    HOOK: logRequest,
  },
  POST: {
    HANDLER: [parseBody(), createUser],
  },
  ALL: {
    CATCHER: errorHandler,
    FALLBACK: notFoundHandler,
  },
} satisfies RouterHandlers<
  CTXCommon,
  {
    GET: CTXAuth;
    POST: CTXBody;
  }
>;
```

### HTTP Method Support

```typescript
type HttpMethod = "HEAD" | "OPTIONS" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Special method shortcuts
"ALL" → Applies to all HTTP methods
"CRUD" → Applies to GET, POST, PUT, PATCH, DELETE
```

---

## Path Parameter Syntax

The framework automatically converts `{param}` in filenames to `:param` in routes:

| Filename                           | Generated Route                | URL Example              |
| ---------------------------------- | ------------------------------ | ------------------------ |
| `[$$].ts`                          | `/.**`                         | `/`,`/a`,`/a/b`          |
| `($$).ts`                          | `/**`                          | `/a`, `/a/b`             |
| `[$].ts`                           | `/.*`                          | `/`, `/a`, `/b`          |
| `($).ts`                           | `/*`                           | `/a`, `/b`               |
| `[page].ts`                        | `/:page`                       | `/index.html`            |
| `blog/[slug].ts`                   | `/blog/:slug`                  | `/blog/post-hello-world` |
| `users/[userId]/posts/[postId].ts` | `/users/:userId/posts/:postId` | `/users/123/posts/456`   |

---

## RouterFramework Class

```typescript
class RouterFramework<EXTContext = {}, Context extends RouterContext<EXTContext> = RouterContext<EXTContext>>
extends Router<Context>
```

### Constructor

```typescript
constructor(config?: RouterFrameworkConfig<Context>)
```

### Properties

| Property  | Type      | Description                                  |
| --------- | --------- | -------------------------------------------- |
| `loading` | `boolean` | Whether routes are currently being loaded    |
| `loaded`  | `boolean` | Whether routes have been successfully loaded |

### Methods

| Method                                      | Description                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `load(): Promise<RouterFramework<Context>>` | Discovers and registers all route files. Throws if already loading/loaded. |

---

## Configuration Options

```typescript
interface RouterFrameworkConfig<
  Context extends RouterContext,
> extends RouterConfig<Context> {
  rootPath?: string; // Directory to scan for routes (default: "./routes")
  filterNode?: (node: DirWalkNode) => boolean; // Filter which files become routes
  processNode?: (node: DirWalkNode) => void; // Transform node before route creation
  onDir?: (node: DirWalkNode) => void; // Callback for directory entries
}
```

### Default Behaviors

**Default `filterNode`:**

```typescript
(node: DirWalkNode) =>
  [".ts", ".js", ".tsx", ".jsx"].some((ext) => node.name.endsWith(ext));
```

**Default `processNode`:**

```typescript
(node: DirWalkNode) => {
  const extensionIndex = node.name.lastIndexOf(".");
  if (extensionIndex !== -1) node.name = node.name.slice(0, extensionIndex);
};
// Removes file extensions: "users.ts" → "users"
```

## API Reference

### `DirWalkNode` Interface

```typescript
interface DirWalkNode {
  type: string; // "file" | "dir"
  name: string; // File/directory name to be used with the router
  path: string; // Full path
  parent: string; // Parent directory path
  fullPath: string; // Resolved absolute path
  relativePath: string; // Path relative to root
}
```

### `RouterHandlers` Type

```typescript
type RouterHandlers<
CommonXContext = {},
MethodContexts extends Partial<Record<HttpMethod | "ALL", Record<string, any>>> = {}

> = {
> [K in HttpMethod | "ALL"]?: {

    [H in UCHandlerType]?: H extends "CATCHER"
      ? Handler<CommonXContext & CTXError & MethodContexts[K]>
        | Pipeline<CommonXContext & CTXError & MethodContexts[K]>
      : Handler<CommonXContext & MethodContexts[K]>
        | Pipeline<CommonXContext & MethodContexts[K]>;

};
};
```

### `walk` Function

```typescript
async function\* walk(
dir: string,
rootPath?: string
): AsyncGenerator<DirWalkNode>
```

Recursively walks a directory and yields `DirWalkNode` objects for each entry.

**Runtime Support:**

- ✅ Deno (uses `Deno.readDir`)
- ✅ Node.js (uses `fs.promises.readdir`)
- ✅ Bun (compatible with Node.js mode)

---

## Best Practices

1. **Use `satisfies RouterHandlers`** for type safety in route files
2. **Organize by feature**, not file type
3. **Keep route files focused** - one resource per file
4. **Use `[$$].ts` sparingly** - prefer explicit routes
5. **Customize `filterNode`** for your project's file extensions
6. **Customize `processNode`** to remove file extensions or transform filename to route name differently
7. **Set `normalizeTrailingSlash: true`** in production for consistent routing

---

## Troubleshooting

### Common Issues

**Issue: Routes not loading**

- Check `rootPath` is correct
- Verify files have valid extensions (.ts, .js, .tsx, .jsx)
- Ensure files export a `default` object

**Issue: Parameter not extracting**

- Use `[param]` in filename, not `:param`
- Access via `ctx.params.param`

**Issue: Type errors in route files**

- Add `satisfies RouterHandlers<CommonContext,MethodSpecificContexts>`
- Import `type RouterHandlers`

---

## License

MIT © Natnael Eshetu
