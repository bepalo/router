"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authJWT = exports.authAPIKey = exports.authBasic = exports.authorize = exports.authenticate = exports.cors = exports.limitRate = exports.parseBody = exports.parseCookie = exports.parseQuery = void 0;
const helpers_1 = require("./helpers");
const cache_1 = require("@bepalo/cache");
const time_1 = require("@bepalo/time");
/**
 * Creates middleware that parses queries from the request url and adds them to the context.
 * @returns {Function} A middleware function that adds parsed queries to context.query
 */
const parseQuery = () => {
    return (req, ctx) => {
        const query = Object.fromEntries(ctx.url.searchParams.entries());
        ctx.query = query;
    };
};
exports.parseQuery = parseQuery;
/**
 * Creates middleware that parses cookies from the request and adds them to the context.
 * @returns {Function} A middleware function that adds parsed cookies to context.cookie
 */
const parseCookie = () => {
    return (req, ctx) => {
        var _a;
        const cookie = (_a = (0, helpers_1.parseCookieFromRequest)(req)) !== null && _a !== void 0 ? _a : {};
        ctx.cookie = cookie;
    };
};
exports.parseCookie = parseCookie;
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
const parseBody = (options) => {
    var _a;
    const accept = (options === null || options === void 0 ? void 0 : options.accept)
        ? Array.isArray(options.accept)
            ? options.accept
            : [options.accept]
        : [
            "application/x-www-form-urlencoded",
            "application/json",
            "text/plain",
        ];
    const maxSize = (_a = options === null || options === void 0 ? void 0 : options.maxSize) !== null && _a !== void 0 ? _a : 1024 * 1024; // Default 1MB
    const once = options === null || options === void 0 ? void 0 : options.once;
    const clone = options === null || options === void 0 ? void 0 : options.clone;
    return (_req, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        if (once && ctx.body)
            return;
        const contentType = (_a = _req.headers.get("content-type")) === null || _a === void 0 ? void 0 : _a.split(";", 2)[0];
        if (!(contentType && accept.includes(contentType))) {
            yield ((_b = _req.body) === null || _b === void 0 ? void 0 : _b.cancel().catch(() => { }));
            return (0, helpers_1.status)(415);
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
                yield ((_c = _req.body) === null || _c === void 0 ? void 0 : _c.cancel().catch(() => { }));
                return (0, helpers_1.status)(413);
            }
            switch (contentType) {
                case "application/x-www-form-urlencoded": {
                    const body = yield req.formData();
                    ctx.body = Object.fromEntries(body.entries());
                    break;
                }
                case "application/json": {
                    const body = yield req.json();
                    if (Array.isArray(body)) {
                        ctx.body = { values: body };
                    }
                    else if (body === undefined) {
                        ctx.body = {};
                    }
                    else if (body === null) {
                        ctx.body = { value: null };
                    }
                    else if (typeof body === "object") {
                        ctx.body = body;
                    }
                    else {
                        ctx.body = { value: body };
                    }
                    break;
                }
                case "text/plain": {
                    const text = yield req.text();
                    ctx.body = { text };
                    break;
                }
                default:
                    ctx.body = {};
                    break;
            }
        }
        catch (error) {
            yield ((_d = _req.body) === null || _d === void 0 ? void 0 : _d.cancel().catch(() => { }));
            return (0, helpers_1.status)(400, "Malformed Payload");
        }
    });
};
exports.parseBody = parseBody;
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
const limitRate = (config) => {
    const { key, refillInterval, refillRate, maxTokens, refillTimeSecondsDenominator = 1000, now = () => Date.now(), cacheConfig = {
        now: () => Date.now(),
        // defaultMaxAgse: Time.for(10).seconds._ms,
        defaultMaxAge: time_1.Time.for(1).hour._ms,
        cleanupInterval: time_1.Time.every(10).minutes._ms,
        onGetMiss: (cache, key, reason) => {
            cache.set(key, { tokens: maxTokens, lastRefill: now() });
            return true;
        },
    }, setXRateLimitHeaders = false, endHere = false, } = config;
    const rateLimits = new cache_1.Cache(cacheConfig);
    if (refillInterval) {
        return function (req, ctx) {
            var _a;
            const id = key(req, ctx);
            const entry = (_a = rateLimits.get(id)) === null || _a === void 0 ? void 0 : _a.value;
            const timeElapsed = now() - entry.lastRefill;
            if (timeElapsed >= refillInterval) {
                if (refillRate) {
                    const newTokens = entry.tokens +
                        refillRate * Math.floor(timeElapsed / refillInterval);
                    entry.tokens = Math.min(newTokens, maxTokens);
                    entry.lastRefill = now();
                }
                else {
                    entry.tokens = maxTokens;
                    entry.lastRefill = now();
                }
            }
            if (entry.tokens <= 0) {
                ctx.headers.set("Retry-After", Math.ceil((refillInterval - timeElapsed) / refillTimeSecondsDenominator).toFixed());
                return (0, helpers_1.status)(429);
            }
            else {
                entry.tokens--;
            }
            if (setXRateLimitHeaders) {
                ctx.headers.set("X-RateLimit-Limit", maxTokens.toFixed());
                ctx.headers.set("X-RateLimit-Remaining", entry.tokens.toFixed());
            }
            if (endHere)
                return true;
        };
    }
    else if (refillRate) {
        return function (req, ctx) {
            var _a;
            const id = key(req, ctx);
            const entry = (_a = rateLimits.get(id)) === null || _a === void 0 ? void 0 : _a.value;
            const timeElapsed = now() - entry.lastRefill;
            const newTokens = entry.tokens +
                (refillRate * timeElapsed) / refillTimeSecondsDenominator;
            entry.tokens = Math.min(newTokens, maxTokens);
            entry.lastRefill = now();
            if (entry.tokens <= 0) {
                ctx.headers.set("Retry-After", Math.ceil(1 / refillRate).toFixed());
                return (0, helpers_1.status)(429);
            }
            else {
                entry.tokens--;
            }
            if (setXRateLimitHeaders) {
                ctx.headers.set("X-RateLimit-Limit", maxTokens.toFixed());
                ctx.headers.set("X-RateLimit-Remaining", Math.max(0, entry.tokens).toFixed());
            }
            if (endHere)
                return true;
        };
    }
    throw new Error("LIMIT-RATE: `refillInterval` or `refillRate` or both should be set");
};
exports.limitRate = limitRate;
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
 * @param {boolean} [options.endHere=false] - If true, stops only pipeline flow per handler type after success.
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
const cors = (config) => {
    const { origins = "*", methods = ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"], allowedHeaders = ["Content-Type", "Authorization"], exposedHeaders, credentials = false, maxAge = 86400, varyOrigin = false, endHere = false, } = config !== null && config !== void 0 ? config : {};
    const globOrigin = origins === "*" ? "*" : null;
    const originsSet = new Set(typeof origins !== "string" ? origins : origins !== "*" ? [] : [origins]);
    return function (req, ctx) {
        const origin = req.headers.get("origin");
        let corsOrigin = null;
        if (!origin) {
            return;
        }
        if (globOrigin) {
            corsOrigin = "*";
        }
        else {
            corsOrigin = originsSet.has(origin) ? origin : null;
        }
        if (!corsOrigin) {
            if (varyOrigin)
                ctx.headers.append("Vary", "Origin");
            return;
        }
        ctx.headers.set("Access-Control-Allow-Origin", corsOrigin);
        if (credentials) {
            if (corsOrigin === "*")
                throw new Error("CORS: Cannot use credentials with wildcard origin");
            ctx.headers.set("Access-Control-Allow-Credentials", "true");
        }
        if (exposedHeaders && exposedHeaders.length > 0) {
            ctx.headers.set("Access-Control-Expose-Headers", exposedHeaders.join(", "));
        }
        if (varyOrigin) {
            ctx.headers.append("Vary", "Origin");
        }
        if (req.method === "OPTIONS") {
            if (methods && methods.length > 0) {
                ctx.headers.set("Access-Control-Allow-Methods", methods.join(", "));
            }
            if (allowedHeaders && allowedHeaders.length > 0) {
                ctx.headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
            }
            if (maxAge) {
                ctx.headers.set("Access-Control-Max-Age", maxAge.toString());
            }
            return (0, helpers_1.status)(204, null);
        }
        if (endHere)
            return true;
    };
};
exports.cors = cors;
/**
 * Middleware to authenticate a request.
 *
 * @template XContext - Additional context type to merge with CTXAuth.
 * @param {Object} [options] - Configuration options.
 * @param {ParseAuthFn}[options.parseAuth] - Function to extract authentication info from the request.
 *   Should return an `Auth` object if valid, `Error` if invalid, or `null/undefined` if missing.
 * @param {boolean} [options.endHere=false] - If true, stops only pipeline flow per handler type after success.
 * @param {boolean} [options.checkOnly=false] - If true, only checks authentication without returning a response.
 *
 * @returns {FreeHandler<Partial<CTXAuth>&XContext>} A handler that sets `ctx.auth` if authentication succeeds,
 *   otherwise returns a `401 Unauthorized` or with error message if available response (unless `checkOnly` is true).
 */
const authenticate = ({ parseAuth, endHere = false, checkOnly = false, }) => {
    return function (req, ctx) {
        var _a;
        const auth = parseAuth(req, ctx);
        if (!auth) {
            return checkOnly ? false : (0, helpers_1.status)(401);
        }
        else if (auth instanceof Error) {
            return checkOnly ? false : (0, helpers_1.status)(401, (_a = auth.message) !== null && _a !== void 0 ? _a : undefined);
        }
        ctx.auth = auth;
        if (endHere)
            return true;
    };
};
exports.authenticate = authenticate;
/**
 * Middleware to authorize a request based on role or permissions.
 *
 * @template XContext - Additional context type to merge with CTXAuth.
 * @param {Object} [options] - Configuration options.
 * @param {(role: string) => boolean}[options.allowRole] - Function to check if a role is allowed.
 * @param {(role: string) => boolean}[options.forbidRole] - Function to check if a role is forbidden.
 * @param {string[]}[options.forPermissions] - List of permissions required for access.
 * @param {(permission: string,role: string) => boolean|null|undefined}[options.hasPermission] - Function to check if a role has a given permission.
 *   Required if `forPermissions` is provided.
 * @param {boolean} [options.endHere=false] - If true, stops only pipeline flow per handler type after success.
 *
 * @returns {FreeHandler<Partial<CTXAuth>&XContext>} A handler that checks `ctx.auth` and enforces role/permission rules.
 *   Returns `401 Unauthorized` if no auth is present, or `403 Forbidden` if checks fail.
 *   Throws an error if `forPermissions` is set without `hasPermission`.
 *
 */
const authorize = ({ allowRole, forbidRole, forPermissions, hasPermission, endHere = false, }) => {
    if (forPermissions && !hasPermission) {
        throw new Error("authorize middleware 'forPermissions' require 'hasPermission'");
    }
    return (req, { auth }) => {
        if (!auth) {
            return (0, helpers_1.status)(401);
        }
        if (allowRole && !allowRole(auth.role)) {
            return (0, helpers_1.status)(403);
        }
        if (forbidRole && forbidRole(auth.role)) {
            return (0, helpers_1.status)(403);
        }
        if (forPermissions && hasPermission) {
            const permitted = forPermissions.some((permission) => hasPermission(permission, auth.role));
            if (!permitted)
                return (0, helpers_1.status)(403);
        }
        if (endHere)
            return true;
    };
};
exports.authorize = authorize;
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
const authBasic = ({ credentials, type = "raw", separator = ":", realm = "Protected", ctxProp = "basicAuth", endHere = false, }) => {
    return (req, ctx) => {
        const authorization = req.headers.get("authorization");
        ctx.headers.set("WWW-Authenticate", `Basic realm="${realm}", charset="UTF-8"`);
        if (!authorization)
            return (0, helpers_1.status)(401);
        const [scheme, creds] = authorization.split(" ", 2);
        if (scheme.toLowerCase() !== "basic" || !creds)
            return (0, helpers_1.status)(401);
        let xcreds = creds;
        if (type === "base64") {
            try {
                xcreds = atob(creds);
            }
            catch (_a) {
                return (0, helpers_1.status)(401);
            }
        }
        const [username, password] = xcreds.split(separator, 2);
        if (!username || !password)
            return (0, helpers_1.status)(401);
        const user = credentials.get(username);
        if (!user || password !== user.password)
            return (0, helpers_1.status)(401);
        ctx[ctxProp] = {
            username,
            role: user.role,
        };
        if (endHere)
            return true;
    };
};
exports.authBasic = authBasic;
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
const authAPIKey = ({ verify, ctxProp = "apiKeyAuth", endHere = false, }) => {
    return (req, ctx) => {
        const apiKey = req.headers.get("X-API-Key");
        if (!apiKey || !verify(apiKey))
            return (0, helpers_1.status)(401);
        ctx[ctxProp] = {
            apiKey,
        };
        if (endHere)
            return true;
    };
};
exports.authAPIKey = authAPIKey;
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
const authJWT = ({ jwt, validate, verifyOptions, ctxProp = "jwtAuth", endHere = false, }) => {
    return (req, ctx) => {
        var _a;
        const authorization = req.headers.get("authorization");
        if (!authorization)
            return (0, helpers_1.status)(401);
        const [scheme, token] = authorization.split(" ", 2);
        if (scheme.toLowerCase() !== "bearer" || !token)
            return (0, helpers_1.status)(401);
        const result = jwt.verifySync(token, verifyOptions);
        if (!result.payload)
            return (0, helpers_1.status)(401, (_a = result.error) === null || _a === void 0 ? void 0 : _a.message);
        if (validate && !validate(result.payload))
            return (0, helpers_1.status)(401);
        ctx[ctxProp] = {
            jwt,
            token,
            payload: result.payload,
        };
        if (endHere)
            return true;
    };
};
exports.authJWT = authJWT;
//# sourceMappingURL=middlewares.js.map