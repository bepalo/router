import Router, { RouterContext } from "./router";
/**
 * Standard HTTP methods supported by the router.
 * These methods correspond to HTTP/1.1 request methods.
 *
 * @typedef {"HEAD"|"OPTIONS"|"GET"|"POST"|"PUT"|"PATCH"|"DELETE"} HttpMethod
 *
 * @example
 * const method: HttpMethod = "GET";
 * const method: HttpMethod = "POST";
 */
export type HttpMethod = "HEAD" | "OPTIONS" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
/**
 * HTTP path pattern type.
 * Represents valid HTTP paths starting with a forward slash.
 *
 * @typedef {`/${string}`} HttpPath
 *
 * @example
 * const path: HttpPath = "/";
 * const path: HttpPath = "/api/users";
 * const path: HttpPath = "/users/:id";
 * const path: HttpPath = "/static/**";
 */
export type HttpPath = `/${string}`;
/**
 * Combined HTTP method and path pattern.
 * Used for route registration with method-specific routing.
 *
 * @typedef {`${HttpMethod} ${HttpPath}`} MethodPath
 *
 * @example
 * const route: MethodPath = "GET /api/users";
 * const route: MethodPath = "POST /api/users";
 * const route: MethodPath = "DELETE /api/users/:id";
 */
export type MethodPath = `${HttpMethod} ${HttpPath}`;
/**
 * Types of handlers in the router pipeline.
 * Each handler type has a specific role in request processing:
 * - `filter`: Runs before handlers, can intercept requests
 * - `hook`: Runs before filters, can't return responses
 * - `handler`: Main request handlers
 * - `fallback`: Runs when no handler matches
 * - `catcher`: Error handlers for exceptions
 * - `after`: Runs after response is created
 *
 * @typedef {"filter"|"hook"|"handler"|"fallback"|"catcher"|"after"} HandlerType
 *
 */
export type HandlerType = "filter" | "hook" | "handler" | "fallback" | "catcher" | "after";
/**
 * Possible return types from route handlers.
 * Handlers can:
 * - Return a Response object to send immediately
 * - Return void/undefined to continue to next handler
 * - Return false to stop processing (for filters)
 * - Return a Promise of any of the above
 *
 * @typedef {Response|void|boolean|Promise<Response|void|boolean>} HandlerResponse
 *
 * @example
 * // Return a Response
 * (req, ctx) => new Response("Hello");
 *
 * // Return void (continue)
 * (req, ctx) => { ctx.user = getUser(); }
 *
 * // Return false (stop processing)
 * (req, ctx) => { if (!authorized) return false; }
 *
 * // Return Promise
 * async (req, ctx) => {
 *   const data = await fetchData();
 *   return json(data);
 * }
 */
export type HandlerResponse = Response | void | boolean | Promise<Response | void | boolean>;
export type BoundHandler<XContext = {}> = (this: Router<XContext>, req: Request, ctx: RouterContext<XContext>) => HandlerResponse;
export type NonBoundHandler<XContext = {}> = (req: Request, ctx: RouterContext<XContext>) => HandlerResponse;
/**
 * Generic handler function type.
 * Represents a function that processes HTTP requests.
 *
 * @template Context - The context type available to the handler
 * @callback Handler
 * @param {Request} req - The incoming HTTP request
 * @param {Context} ctx - The request context with params, headers, etc.
 * @returns {HandlerResponse} The handler's response
 *
 * @example
 * // Simple handler that returns JSON
 * const userHandler: Handler<MyContext> = async (req, ctx) => {
 *   const users = await getUsers();
 *   return json(users);
 * };
 *
 * @example
 * // Handler that modifies context and continues
 * const authHandler: Handler<MyContext> = (req, ctx) => {
 *   const token = req.headers.get("Authorization");
 *   if (token) {
 *     ctx.user = decodeToken(token);
 *   }
 *   // Return nothing to continue to next handler
 * };
 */
export type Handler<XContext = {}> = NonBoundHandler<XContext> | BoundHandler<XContext>;
/**
 * Array of handler functions executed in sequence.
 * Used to group multiple handlers for a route.
 *
 * @template Context - The context type available to handlers
 * @typedef {Array<Handler<Context>>} Pipeline
 *
 * @example
 * // Pipeline with multiple handlers
 * const userPipeline: Pipeline<MyContext> = [
 *   rateLimiter,       // Apply rate limiting
 *   authMiddleware,    // Check authentication
 *   validateInput,     // Validate request body
 *   userHandler        // Main request logic
 * ];
 *
 * @example
 * // Register pipeline with router
 * router.handle("GET /users", userPipeline);
 */
export type Pipeline<Context = {}> = Array<Handler<Context>>;
/**
 * HTTP header tuple.
 *
 * @typedef {[string, string]} HeaderTuple
 *
 */
export type HeaderTuple = [string, string];
//# sourceMappingURL=types.d.ts.map