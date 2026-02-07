import { parseCookieFromRequest, status } from "./helpers";
import type { RouterContext } from "./router";
import type { FreeHandler, Handler, HttpMethod, CTXAddress } from "./types";
import { Cache, CacheConfig } from "@bepalo/cache";
import { JWT, JwtPayload, JwtVerifyOptions } from "@bepalo/jwt";
import { Time } from "@bepalo/time";

/**
 * Context object containing parsed cookies.
 * @typedef {Object} CTXCookie
 * @property {Record<string, string>} cookie - Parsed cookies from the request
 */
export type CTXCookie = {
  cookie: Record<string, string>;
};

/**
 * Creates middleware that parses cookies from the request and adds them to the context.
 * @returns {Function} A middleware function that adds parsed cookies to context.cookie
 * @example
 * const cookieParser = parseCookie();
 * // Use in respondWith: respondWith({}, cookieParser(), ...otherHandlers)
 */
export const parseCookie = <
  Context extends CTXCookie,
>(): FreeHandler<Context> => {
  return (req: Request, ctx: Context) => {
    const cookie = parseCookieFromRequest(req) ?? {};
    ctx.cookie = cookie;
  };
};

/**
 * Parsed body object types.
 * @typedef {Object} ParsedBody
 */
export type ParsedBody =
  | { value: string | number | boolean | null }
  | { values: unknown[] }
  | Record<string, unknown>;

/**
 * Context object containing parsed request body.
 * @typedef {Object} CTXBody
 * @property {ParsedBody} body - Parsed request body data
 */
export type CTXBody = {
  body: ParsedBody;
};

/**
 * Supported media types for request body parsing.
 * @typedef {"application/x-www-form-urlencoded"|"application/json"|"text/plain"} SupportedBodyMediaTypes
 */
export type SupportedBodyMediaTypes =
  | "application/x-www-form-urlencoded"
  | "application/json"
  | "text/plain";

/**
 * Creates middleware that parses the request body based on Content-Type.
 * Supports url-encoded forms, JSON, and plain text.
 * @param {Object} [options] - Configuration options for body parsing
 * @param {SupportedBodyMediaTypes|SupportedBodyMediaTypes[]} [options.accept] - Media types to accept (defaults to all supported)
 * @param {number} [options.maxSize] - Maximum body size in bytes (defaults to 1MB)
 * @param {number} [options.once] - Do not parse if parsed already. checks `ctx.body`
 * @param {number} [options.clone] - Clone request before parsing it. Useful for forwarding.
 * @returns {Function} A middleware function that adds parsed body to context.body
 * @throws {Response} Returns a 415 response if content-type is not accepted
 * @throws {Response} Returns a 413 response if body exceeds maxSize
 * @throws {Response} Returns a 400 response if body is malformed
 */
export const parseBody = <Context extends CTXBody>(options?: {
  accept?: SupportedBodyMediaTypes | SupportedBodyMediaTypes[]; // defaults to all
  maxSize?: number; // in bytes
  once?: boolean;
  clone?: boolean;
}): FreeHandler<Context> => {
  const accept = options?.accept
    ? Array.isArray(options.accept)
      ? options.accept
      : [options.accept]
    : ([
        "application/x-www-form-urlencoded",
        "application/json",
        "text/plain",
      ] as string[]);
  const maxSize = options?.maxSize ?? 1024 * 1024; // Default 1MB
  const once = options?.once;
  const clone = options?.clone;
  return async (_req: Request, ctx: Context) => {
    console.log(_req.url, { once, body: ctx.body });
    if (once && ctx.body) return;
    const contentType = _req.headers.get("content-type")?.split(";", 2)[0];
    if (!(contentType && accept.includes(contentType))) {
      await _req.body?.cancel().catch(() => {});
      return status(415);
    }
    const req = clone ? _req.clone() : _req;
    try {
      const contentLengthHeader = req.headers.get("content-length");
      const contentLength = contentLengthHeader
        ? parseInt(contentLengthHeader)
        : undefined;
      if (contentLength === 0) {
        ctx.body = {};
        return;
      }
      if (contentLength !== undefined && contentLength > maxSize) {
        await _req.body?.cancel().catch(() => {});
        return status(413);
      }
      switch (contentType) {
        case "application/x-www-form-urlencoded": {
          const body = await req.formData();
          ctx.body = Object.fromEntries(body.entries());
          break;
        }
        case "application/json": {
          const body = await req.json();
          if (Array.isArray(body)) {
            ctx.body = { values: body };
          } else if (body === undefined) {
            ctx.body = {};
          } else if (body === null) {
            ctx.body = { value: null };
          } else if (typeof body === "object") {
            ctx.body = body;
          } else {
            ctx.body = { value: body };
          }
          break;
        }
        case "text/plain": {
          const text = await req.text();
          ctx.body = { text };
          break;
        }
        default:
          ctx.body = {};
          break;
      }
    } catch (error) {
      await _req.body?.cancel().catch(() => {});
      return status(400, "Malformed Payload");
    }
  };
};

/**
 * Creates a rate limiting middleware using token bucket algorithm.
 * Supports both fixed interval refill and continuous rate-based refill.
 *
 * @template Context - Must extend RouterContext & CTXAddress
 * @param {Object} config - Rate limiting configuration
 * @param {Function} config.key - Function to generate cache key from request and context
 * @param {number} [config.refillInterval] - Fixed interval in milliseconds for token refill
 * @param {number} [config.refillRate] - Continuous refill rate in tokens per second (or custom denominator)
 * @param {number} config.maxTokens - Maximum number of tokens in the bucket
 * @param {number} [config.refillTimeSecondsDenominator=1000] - Denominator for time calculations (default: 1000 = seconds)
 * @param {Function} [config.now=Date.now] - Function returning current timestamp in milliseconds
 * @param {CacheConfig<string, any>} [config.cacheConfig] - Configuration for the underlying cache
 * @param {boolean} [config.setXRateLimitHeaders=false] - Whether to set X-RateLimit headers in response
 * @returns {Function} Middleware function that enforces rate limits
 *
 * @example
 * // Fixed interval rate limiting (10 requests per minute)
 * const rateLimiter = limitRate({
 *   key: (req, ctx) => ctx.address.address, // IP-based limiting
 *   refillInterval: 60 * 1000, // 1 minute
 *   refillRate: 10, // 10 tokens per interval
 *   maxTokens: 10,
 *   setXRateLimitHeaders: true
 * });
 *
 * @example
 * // Continuous rate limiting (100 requests per hour)
 * const rateLimiter = limitRate({
 *   key: (req, ctx) => req.headers.get('x-user-id') || 'anonymous',
 *   refillRate: 100 / (60 * 60), // 100 tokens per hour
 *   maxTokens: 100,
 *   refillTimeSecondsDenominator: 1 // Use seconds as time unit
 * });
 *
 * @throws {Error} If neither refillInterval nor refillRate is provided
 */
export const limitRate = <
  XContext = {},
  Context extends RouterContext<XContext & CTXAddress> = RouterContext<
    XContext & CTXAddress
  >,
>(config: {
  key: (req: Request, ctx: Context) => string;
  refillInterval?: number;
  refillRate?: number;
  maxTokens: number;
  refillTimeSecondsDenominator?: number;
  now?: () => number;
  cacheConfig?: CacheConfig<string, any>;
  setXRateLimitHeaders?: boolean;
  endHere?: boolean;
}): Handler<Context> => {
  const {
    key,
    refillInterval,
    refillRate,
    maxTokens,
    refillTimeSecondsDenominator = 1000,
    now = () => Date.now(),
    cacheConfig = {
      now: () => Date.now(),
      // defaultMaxAgse: Time.for(10).seconds._ms,
      defaultMaxAge: Time.for(1).hour._ms,
      cleanupInterval: Time.every(10).minutes._ms,
      onGetMiss: (cache: Cache<string, any>, key, reason) => {
        cache.set(key, { tokens: maxTokens, lastRefill: now() });
        return true;
      },
    },
    setXRateLimitHeaders = false,
    endHere = false,
  } = config;
  type CacheEntry = {
    tokens: number;
    lastRefill: number;
  };
  const rateLimits: Cache<string, CacheEntry> = new Cache(cacheConfig);
  if (refillInterval) {
    return function (req: Request, ctx: Context) {
      const id = key(req, ctx);
      const entry = rateLimits.get(id)?.value as CacheEntry;
      const timeElapsed = now() - entry.lastRefill;
      if (timeElapsed >= refillInterval) {
        if (refillRate) {
          const newTokens =
            entry.tokens +
            refillRate * Math.floor(timeElapsed / refillInterval);
          entry.tokens = Math.min(newTokens, maxTokens);
          entry.lastRefill = now();
        } else {
          entry.tokens = maxTokens;
          entry.lastRefill = now();
        }
      }
      if (entry.tokens <= 0) {
        ctx.headers.set(
          "Retry-After",
          Math.ceil(
            (refillInterval - timeElapsed) / refillTimeSecondsDenominator,
          ).toFixed(),
        );
        return status(429);
      } else {
        entry.tokens--;
      }
      if (setXRateLimitHeaders) {
        ctx.headers.set("X-RateLimit-Limit", maxTokens.toFixed());
        ctx.headers.set("X-RateLimit-Remaining", entry.tokens.toFixed());
      }
      if (endHere) return true;
    };
  } else if (refillRate) {
    return function (req: Request, ctx: Context) {
      const id = key(req, ctx);
      const entry = rateLimits.get(id)?.value as CacheEntry;
      const timeElapsed = now() - entry.lastRefill;
      const newTokens =
        entry.tokens +
        (refillRate * timeElapsed) / refillTimeSecondsDenominator;
      entry.tokens = Math.min(newTokens, maxTokens);
      entry.lastRefill = now();
      if (entry.tokens <= 0) {
        ctx.headers.set("Retry-After", Math.ceil(1 / refillRate).toFixed());
        return status(429);
      } else {
        entry.tokens--;
      }
      if (setXRateLimitHeaders) {
        ctx.headers.set("X-RateLimit-Limit", maxTokens.toFixed());
        ctx.headers.set(
          "X-RateLimit-Remaining",
          Math.max(0, entry.tokens).toFixed(),
        );
      }
      if (endHere) return true;
    };
  }
  throw new Error(
    "LIMIT-RATE: `refillInterval` or `refillRate` or both should be set",
  );
};

/**
 * Creates a CORS (Cross-Origin Resource Sharing) middleware.
 * Supports preflight requests and configurable CORS headers.
 *
 * @template Context - Must extend RouterContext
 * @param {Object} [config] - CORS configuration
 * @param {string|string[]|"*"} [config.origins="*"] - Allowed origins (wildcard "*", single origin, or array)
 * @param {HttpMethod[]} [config.methods=["GET","HEAD","PUT","PATCH","POST","DELETE"]] - Allowed HTTP methods
 * @param {string[]} [config.allowedHeaders=["Content-Type","Authorization"]] - Allowed request headers
 * @param {string[]} [config.exposedHeaders] - Headers exposed to the browser
 * @param {boolean} [config.credentials=false] - Allow credentials (cookies, authorization headers)
 * @param {number} [config.maxAge=86400] - Maximum age for preflight cache in seconds
 * @param {boolean} [config.varyOrigin=false] - Add Vary: Origin header for caching
 * @returns {Function} Middleware function that handles CORS headers
 *
 * @example
 * // Basic CORS with all defaults
 * const corsMiddleware = cors();
 *
 * @example
 * // Specific origins with credentials
 * const corsMiddleware = cors({
 *   origins: ["https://example.com", "https://api.example.com"],
 *   credentials: true,
 *   methods: ["GET", "POST", "PUT", "DELETE"],
 *   allowedHeaders: ["Content-Type", "Authorization", "X-Custom-Header"]
 * });
 *
 * @throws {Error} If credentials is true with wildcard origin ("*")
 */
export const cors = <
  XContext = {},
  Context extends RouterContext<XContext> = RouterContext<XContext>,
>(config?: {
  origins: "*" | string | string[];
  methods?: HttpMethod[] | null;
  allowedHeaders?: string[] | null;
  exposedHeaders?: string[] | null;
  credentials?: boolean | null;
  maxAge?: number | null;
  varyOrigin?: boolean;
  endHere?: boolean;
}): Handler<Context> => {
  const {
    origins = "*",
    methods = ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders = ["Content-Type", "Authorization"],
    exposedHeaders,
    credentials = false,
    maxAge = 86400,
    varyOrigin = false,
    endHere = false,
  } = config ?? {};
  const globOrigin = origins === "*" ? "*" : null;
  const originsSet = new Set(
    typeof origins !== "string" ? origins : origins !== "*" ? [] : [origins],
  );
  return function (req: Request, ctx: Context) {
    const origin = req.headers.get("origin");
    let corsOrigin: string | null = null;
    if (!origin) {
      return;
    }
    if (globOrigin) {
      corsOrigin = "*";
    } else {
      corsOrigin = originsSet.has(origin) ? origin : null;
    }
    if (!corsOrigin) {
      if (varyOrigin) ctx.headers.append("Vary", "Origin");
      return;
    }
    ctx.headers.set("Access-Control-Allow-Origin", corsOrigin);
    if (credentials) {
      if (corsOrigin === "*")
        throw new Error("CORS: Cannot use credentials with wildcard origin");
      ctx.headers.set("Access-Control-Allow-Credentials", "true");
    }
    if (exposedHeaders && exposedHeaders.length > 0) {
      ctx.headers.set(
        "Access-Control-Expose-Headers",
        exposedHeaders.join(", "),
      );
    }
    if (varyOrigin) {
      ctx.headers.append("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      if (methods && methods.length > 0) {
        ctx.headers.set("Access-Control-Allow-Methods", methods.join(", "));
      }
      if (allowedHeaders && allowedHeaders.length > 0) {
        ctx.headers.set(
          "Access-Control-Allow-Headers",
          allowedHeaders.join(", "),
        );
      }
      if (maxAge) {
        ctx.headers.set("Access-Control-Max-Age", maxAge.toString());
      }
      return status(204, null);
    }
    if (endHere) return true;
  };
};

/**
 * Context type for Basic Authentication middleware.
 * @template {string} [prop="basicAuth"] - Property name to store auth data in context
 * @typedef {RouterContext & {[K in prop]?: {username: string; role: string} & Record<string, any>}} CTXBasicAuth
 */
export type CTXBasicAuth<prop extends string = "basicAuth"> = RouterContext<{
  [K in prop]?: {
    username: string;
    role: string;
  } & Record<string, any>;
}>;

/**
 * Creates a Basic Authentication middleware.
 * Supports RFC 7617 Basic Authentication scheme.
 *
 * @template Context - Must extend CTXBasicAuth
 * @template {string} prop - Property name to store auth data in context
 * @param {Object} config - Basic Authentication configuration
 * @param {Map<string, {pass: string} & Record<string, any>>} config.credentials - Map of usernames to user data (must include 'pass')
 * @param {"raw"|"base64"} [config.type="raw"] - Credential encoding type
 * @param {":"|" "} [config.separator=":"] - Separator between username and password
 * @param {string} [config.realm="Protected"] - Authentication realm
 * @param {prop} [config.ctxProp="basicAuth"] - Context property name for auth data
 * @returns {Function} Middleware function that validates Basic Authentication
 *
 * @example
 * // Simple username/password authentication
 * const users = new Map();
 * users.set("admin", { pass: "secret123", role: "admin", permissions: ["read", "write"] });
 * users.set("user", { pass: "password", role: "user", permissions: ["read"] });
 *
 * const basicAuth = authBasic({
 *   credentials: users,
 *   realm: "My API",
 *   ctxProp: "user" // Store in ctx.user instead of ctx.basicAuth
 * });
 */
export const authBasic = <
  Context extends CTXBasicAuth,
  prop extends string = "basicAuth",
>({
  credentials,
  type = "raw",
  separator = ":",
  realm = "Protected",
  ctxProp = "basicAuth" as prop,
  endHere = false,
}: {
  credentials: Map<string, { password: string } & Record<string, any>>;
  type?: "raw" | "base64";
  separator?: ":" | " ";
  realm?: string;
  ctxProp?: prop;
  endHere?: boolean;
}): Handler<Context> => {
  return (req: Request, ctx: Context) => {
    const authorization = req.headers.get("authorization");
    ctx.headers.set(
      "WWW-Authenticate",
      `Basic realm="${realm}", charset="UTF-8"`,
    );
    if (!authorization) return status(401);
    const [scheme, creds] = authorization.split(" ", 2);
    if (scheme.toLowerCase() !== "basic" || !creds) return status(401);
    let xcreds;
    try {
      xcreds = type === "base64" ? atob(creds) : creds;
    } catch {
      return status(401);
    }
    const [username, password] = xcreds.split(separator, 2);
    if (!username || !password) return status(401);
    const user = credentials.get(username);
    if (!user || password !== user.pass) return status(401);
    (ctx as { [K in prop]: any })[ctxProp] = {
      username,
      role: user.role,
    };
    if (endHere) return true;
  };
};

/**
 * Context type for API Key Authentication middleware.
 * @template {string} [prop="apiKeyAuth"] - Property name to store auth data in context
 * @typedef {RouterContext & {[K in prop]?: {apiKey: string} & Record<string, any>}} CTXAPIKeyAuth
 */
export type CTXAPIKeyAuth<prop extends string = "apiKeyAuth"> = RouterContext<{
  [K in prop]?: {
    apiKey: string;
  } & Record<string, any>;
}>;

/**
 * Creates an API Key Authentication middleware.
 * Validates API keys from X-API-Key header.
 *
 * @template Context - Must extend CTXAPIKeyAuth
 * @template {string} prop - Property name to store auth data in context
 * @param {Object} config - API Key Authentication configuration
 * @param {Function} config.verify - Function to verify API key (returns boolean)
 * @param {prop} [config.ctxProp="apiKeyAuth"] - Context property name for auth data
 * @returns {Function} Middleware function that validates API keys
 *
 * @example
 * // API key validation with database lookup
 * const apiKeys = new Set(["abc123", "def456", "ghi789"]);
 *
 * const apiKeyAuth = authAPIKey({
 *   verify: (apiKey) => apiKeys.has(apiKey),
 *   ctxProp: "apiClient" // Store in ctx.apiClient
 * });
 *
 * @example
 * // API key with additional validation
 * const apiKeyAuth = authAPIKey({
 *   verify: (apiKey) => {
 *     // Validate format
 *     if (!apiKey.startsWith("sk_")) return false;
 *
 *     // Check against database
 *     return db.apiKeys.isValid(apiKey);
 *   }
 * });
 */
export const authAPIKey = <
  Context extends CTXAPIKeyAuth,
  prop extends string = "apiKeyAuth",
>({
  verify,
  ctxProp = "apiKeyAuth" as prop,
  endHere = false,
}: {
  verify: (apiKey: string) => boolean;
  ctxProp?: prop;
  endHere?: boolean;
}): Handler<Context> => {
  return (req: Request, ctx: Context) => {
    const apiKey = req.headers.get("X-API-Key");
    if (!apiKey || !verify(apiKey)) return status(401);
    (ctx as { [K in prop]: any })[ctxProp] = {
      apiKey,
    };
    if (endHere) return true;
  };
};

/**
 * Context type for JWT Authentication middleware.
 * @template {JwtPayload<{}>} Payload - JWT payload type
 * @template {string} [prop="jwtAuth"] - Property name to store auth data in context
 * @typedef {RouterContext & {[K in prop]?: {jwt: JWT<Payload>; token: string; payload: Payload} & Record<string, any>}} CTXJWTAuth
 */
export type CTXJWTAuth<
  Payload extends JwtPayload<{}>,
  prop extends string = "jwtAuth",
> = RouterContext<{
  [K in prop]?: {
    jwt: JWT<Payload>;
    token: string;
    payload: Payload;
  } & Record<string, any>;
}>;

/**
 * Creates a JWT (JSON Web Token) Authentication middleware.
 * Validates Bearer tokens from Authorization header.
 *
 * @template {JwtPayload<{}>} Payload - JWT payload type
 * @template Context - Must extend CTXJWTAuth<Payload, prop>
 * @template {string} prop - Property name to store auth data in context
 * @param {Object} config - JWT Authentication configuration
 * @param {JWT<Payload>} config.jwt - JWT instance for verification
 * @param {Function} [config.validate] - Additional payload validation function
 * @param {JwtVerifyOptions} [config.verifyOptions] - JWT verification options
 * @param {prop} [config.ctxProp="jwtAuth"] - Context property name for auth data
 * @returns {Function} Middleware function that validates JWT tokens
 *
 * @example
 * // Simple JWT authentication
 * const jwt = new JWT({ secret: process.env.JWT_SECRET });
 *
 * const jwtAuth = authJWT({
 *   jwt,
 *   validate: (payload) => payload.exp > Date.now() / 1000, // Check expiration
 *   ctxProp: "auth" // Store in ctx.auth
 * });
 *
 * @example
 * // JWT with custom payload validation
 * interface MyPayload extends JwtPayload<{}> {
 *   userId: string;
 *   role: string;
 *   permissions: string[];
 * }
 *
 * const jwt = new JWT<MyPayload>({ secret: process.env.JWT_SECRET });
 *
 * const jwtAuth = authJWT<MyPayload>({
 *   jwt,
 *   validate: (payload) => {
 *     // Custom business logic
 *     if (!payload.userId) return false;
 *     if (payload.role !== "admin") return false;
 *     return true;
 *   },
 *   verifyOptions: {
 *     algorithms: ["HS256"],
 *     maxAge: "2h"
 *   }
 * });
 */
export const authJWT = <
  Payload extends JwtPayload<{}>,
  Context extends CTXJWTAuth<Payload, prop>,
  prop extends string = "jwtAuth",
>({
  jwt,
  validate,
  verifyOptions,
  ctxProp = "jwtAuth" as prop,
  endHere = false,
}: {
  jwt: JWT<Payload>;
  validate?: (payload: Payload) => boolean;
  verifyOptions?: JwtVerifyOptions;
  ctxProp?: prop;
  endHere?: boolean;
}): Handler<Context> => {
  return (req: Request, ctx: Context) => {
    const authorization = req.headers.get("authorization");
    if (!authorization) return status(401);
    const [scheme, token] = authorization.split(" ", 2);
    if (scheme.toLowerCase() !== "bearer" || !token) return status(401);
    const result = jwt.verifySync(token, verifyOptions);
    if (!result.payload) return status(401, result.error?.message);
    if (validate && !validate(result.payload)) return status(401);
    (ctx as { [K in prop]: any })[ctxProp] = {
      jwt,
      token,
      payload: result.payload,
    };
    if (endHere) return true;
  };
};
