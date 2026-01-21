/**
 * @file A fast radix-trie based router for JavaScript runtimes.
 * @module @bepalo/router
 * @author Natnael Eshetu
 * @exports Router
 */
import { Tree } from "./tree.js";
import { HttpMethod, MethodPath, Pipeline, HandlerType, HttpPath, Handler } from "./types.js";
/**
 * Checks if a string is a valid HTTP method.
 * @param {string} method - The method string to validate
 * @returns {boolean} True if the method is valid, false otherwise
 */
export declare const isValidHttpMethod: (method: string) => boolean;
/**
 * Represents a parameter extracted from a route path.
 * @typedef {Object} NodeParam
 * @property {string} name - The parameter name (without the colon)
 * @property {number} index - The position of the parameter in the path
 */
type NodeParam = {
    name: string;
    index: number;
};
/**
 * Represents a node in the routing tree.
 * @typedef {Object} RouteNode
 * @property {HttpMethod} method - HTTP method for this route
 * @property {string} pathname - The original path pattern
 * @property {Array<string>} nodes - Split path segments for the trie
 * @property {Pipeline<Context>} pipeline - Handlers to execute for this route
 * @property {Map<number, NodeParam>} [params] - Parameters extracted from the path
 * @template Context
 */
type RouteNode<Context> = {
    method: HttpMethod;
    pathname: string;
    nodes: Array<string>;
    pipeline: Pipeline<Context>;
    params?: Map<number, NodeParam>;
};
/**
 * Base context object for router handlers.
 * @typedef {Object} RouterContext
 * @property {Record<string, string>} params - Route parameters extracted from the URL
 * @property {Headers} headers - Response headers (can be modified by handlers)
 * @property {Response} [response] - The final response object (set by handlers)
 * @property {Error} [error] - Error object (set when an exception occurs)
 * @property {Object} found - Information about which route types were matched
 * @property {boolean} found.hooks - Whether any hooks were found
 * @property {boolean} found.afters - Whether any after handlers were found
 * @property {boolean} found.filters - Whether any filters were found
 * @property {boolean} found.handlers - Whether any handlers were found
 * @property {boolean} found.fallbacks - Whether any fallbacks were found
 * @property {boolean} found.catchers - Whether any catchers were found
 */
export interface RouterContext {
    params: Record<string, string>;
    headers: Headers;
    response?: Response;
    error?: Error;
    found: {
        hooks: boolean;
        afters: boolean;
        filters: boolean;
        handlers: boolean;
        fallbacks: boolean;
        catchers: boolean;
    };
}
/**
 * Configuration options for enabling/disabling handler types.
 * @typedef {Object} HandlerEnable
 * @property {boolean} hooks - Enable hook handlers
 * @property {boolean} afters - Enable after handlers
 * @property {boolean} filters - Enable filter handlers
 * @property {boolean} fallbacks - Enable fallback handlers
 * @property {boolean} catchers - Enable catcher handlers
 */
interface HandlerEnable {
    hooks: boolean;
    afters: boolean;
    filters: boolean;
    fallbacks: boolean;
    catchers: boolean;
}
/**
 * Configuration options for the Router.
 * @typedef {Object} RouterConfig
 * @property {Array<[string, string]>} [defaultHeaders] - Default headers to add to all responses
 * @property {Handler<Context>} [defaultCatcher] - Default error handler for uncaught exceptions
 * @property {Handler<Context>} [defaultFallback] - Default handler for unmatched routes
 * @property {HandlerEnable} [enable] - Configuration for enabling/disabling handler types
 * @template Context
 */
export interface RouterConfig<Context extends RouterContext> {
    defaultHeaders?: Array<[string, string]>;
    defaultCatcher?: Handler<Context>;
    defaultFallback?: Handler<Context>;
    enable?: HandlerEnable;
}
/**
 * Options for route registration.
 * @typedef {Object} HandlerOptions
 * @property {boolean} [overwrite] - Allow overwriting existing routes
 */
export interface HandlerOptions {
    overwrite?: boolean;
}
/**
 * Handler settings infromation for use with append and auditing
 */
interface HandlerSetter<Context extends RouterContext> {
    handlerType: HandlerType;
    urls: "*" | MethodPath | Array<MethodPath>;
    pipeline: Handler<Context> | Pipeline<Context>;
    options?: HandlerOptions;
}
/**
 * A fast radix-trie based router for JavaScript runtimes.
 * Supports hooks, filters, handlers, fallbacks, catchers, and after handlers.
 * @class
 * @template Context
 * @example
 * const router = new Router();
 *
 * // Register a simple GET handler
 * router.handle("GET /users/:id", async (req, ctx) => {
 *   const userId = ctx.params.id;
 *   return json({ userId });
 * });
 *
 * // Register a hook that runs before all /api routes
 * router.hook("* /api/**", (req, ctx) => {
 *   console.log(`API request: ${req.method} ${req.url}`);
 * });
 *
 * // Register an error handler
 * router.catch("* /**", (req, ctx) => {
 *   console.error(ctx.error);
 *   return json({ error: "Something went wrong" }, { status: 500 });
 * });
 *
 * // Handle a request and get a response
 * const response = await router.respond(new Request("http://localhost/"));
 *
 */
export declare class Router<Context extends RouterContext = RouterContext> {
    #private;
    /**
     * Static property containing all HTTP methods with wildcard paths.
     * @type {Array<SplitURL>}
     * @readonly
     */
    static ALL_METHOD_PATHS: SplitURL[];
    /**
     * Gets the routing trees for all handler types.
     * @returns {Record<HandlerType, Record<HttpMethod, Tree<RouteNode<Context>>>>}
     */
    get trees(): Record<HandlerType, Record<HttpMethod, Tree<RouteNode<Context>>>>;
    /**
     * Gets the enabled handler types configuration.
     * @returns {HandlerEnable}
     */
    get enabled(): HandlerEnable;
    /**
     * Gets the default headers configuration.
     * @returns {Array<[string, string]>}
     */
    get defaultHeaders(): Array<[string, string]>;
    /**
     * Gets the default catcher handler.
     * @returns {Handler<Context>|undefined}
     */
    get defaultCatcher(): Handler<Context> | undefined;
    /**
     * Gets the default fallback handler.
     * @returns {Handler<Context>|undefined}
     */
    get defaultFallback(): Handler<Context> | undefined;
    /**
     * Gets the route registration history.
     * @returns {Set<HandlerSetter<Context>>}
     */
    get setters(): Set<HandlerSetter<Context>>;
    /**
     * Creates a new Router instance.
     * @param {RouterConfig<Context>} [config] - Configuration options
     */
    constructor(config?: RouterConfig<Context>);
    /**
     * Registers a hook handler that runs before other handlers.
     * Hooks cannot modify the response directly but can modify context.
     * Their responses are ignored.
     * @param {"*"|MethodPath|Array<MethodPath>} urls - URL patterns to match
     * @param {Handler<Context & XContext>|Pipeline<Context & XContext>} pipeline - Handler(s) to execute
     * @param {HandlerOptions} [options] - Registration options
     * @returns {Router<Context & XContext>} The router instance for chaining
     * @template XContext
     * @example
     * router.hook("GET /api/**", (req, ctx) => {
     *   ctx.startTime = Date.now();
     * });
     */
    hook<XContext = {}>(urls: "*" | MethodPath | Array<MethodPath>, pipeline: Handler<Context & XContext> | Pipeline<Context & XContext>, options?: HandlerOptions): Router<Context & XContext>;
    /**
     * Registers an after handler that runs after the response is created.
     * After handlers can inspect and modify the response from the context.
     * Their responses are ignored.
     * @param {"*"|MethodPath|Array<MethodPath>} urls - URL patterns to match
     * @param {Handler<Context & XContext>|Pipeline<Context & XContext>} pipeline - Handler(s) to execute
     * @param {HandlerOptions} [options] - Registration options
     * @returns {Router<Context & XContext>} The router instance for chaining
     * @template XContext
     * @example
     * router.after("GET /**", (req, ctx) => {
     *   console.log(`Request completed: ${req.method} ${req.url}`);
     * });
     */
    after<XContext = {}>(urls: "*" | MethodPath | Array<MethodPath>, pipeline: Handler<Context & XContext> | Pipeline<Context & XContext>, options?: HandlerOptions): Router<Context & XContext>;
    /**
     * Registers a filter handler that can intercept and modify requests.
     * Filters run after hooks but before handlers and can return a response.
     * @param {"*"|MethodPath|Array<MethodPath>} urls - URL patterns to match
     * @param {Handler<Context & XContext>|Pipeline<Context & XContext>} pipeline - Handler(s) to execute
     * @param {HandlerOptions} [options] - Registration options
     * @returns {Router<Context & XContext>} The router instance for chaining
     * @template XContext
     * @example
     * router.filter("GET /admin/**", (req, ctx) => {
     *   if (!req.headers.get("x-admin-token")) {
     *     return json({ error: "Unauthorized" }, { status: 401 });
     *   }
     * });
     */
    filter<XContext = {}>(urls: "*" | MethodPath | Array<MethodPath>, pipeline: Handler<Context & XContext> | Pipeline<Context & XContext>, options?: HandlerOptions): Router<Context & XContext>;
    /**
     * Registers a main request handler.
     * Handlers are the primary way to respond to requests.
     * @param {"*"|MethodPath|Array<MethodPath>} urls - URL patterns to match
     * @param {Handler<Context & XContext>|Pipeline<Context & XContext>} pipeline - Handler(s) to execute
     * @param {HandlerOptions} [options] - Registration options
     * @returns {Router<Context & XContext>} The router instance for chaining
     * @template XContext
     * @example
     * router.handle("GET /users", async (req, ctx) => {
     *   const users = await getUsers();
     *   return json({ users });
     * });
     */
    handle<XContext = {}>(urls: "*" | MethodPath | Array<MethodPath>, pipeline: Handler<Context & XContext> | Pipeline<Context & XContext>, options?: HandlerOptions): Router<Context & XContext>;
    /**
     * Registers a fallback handler that runs when no main handler matches.
     * Fallbacks are useful for custom 404 pages or default behaviors.
     * @param {"*"|MethodPath|Array<MethodPath>} urls - URL patterns to match
     * @param {Handler<Context & XContext>|Pipeline<Context & XContext>} pipeline - Handler(s) to execute
     * @param {HandlerOptions} [options] - Registration options
     * @returns {Router<Context & XContext>} The router instance for chaining
     * @template XContext
     * @example
     * router.fallback("GET /**", (req, ctx) => {
     *   return json({ error: "Not found" }, { status: 404 });
     * });
     */
    fallback<XContext = {}>(urls: "*" | MethodPath | Array<MethodPath>, pipeline: Handler<Context & XContext> | Pipeline<Context & XContext>, options?: HandlerOptions): Router<Context & XContext>;
    /**
     * Registers an error handler for catching exceptions.
     * Catchers receive the error in the context and can return a response.
     * @param {"*"|MethodPath|Array<MethodPath>} urls - URL patterns to match
     * @param {Handler<Context & XContext & { error: Error }>|Pipeline<Context & XContext & { error: Error }>} pipeline - Handler(s) to execute
     * @param {HandlerOptions} [options] - Registration options
     * @returns {Router<Context & XContext & { error: Error }>} The router instance for chaining
     * @template XContext
     * @example
     * router.catch("GET /**", (req, ctx) => {
     *   console.error(ctx.error);
     *   return json({ error: "Internal server error" }, { status: 500 });
     * });
     */
    catch<XContext = {}>(urls: "*" | MethodPath | Array<MethodPath>, pipeline: Handler<Context & XContext & {
        error: Error;
    }> | Pipeline<Context & XContext & {
        error: Error;
    }>, options?: HandlerOptions): Router<Context & XContext & {
        error: Error;
    }>;
    /**
     * Appends routes from another router under a base URL.
     * Useful for mounting sub-routers or organizing routes by prefix.
     * @param {`/${string}`} baseUrl - The base URL to mount the router under
     * @param {Router<Context>} router - The router to append
     * @param {HandlerOptions} [options] - Registration options
     * @returns {Router<Context>} The router instance for chaining
     * @example
     * const apiRouter = new Router();
     * apiRouter.handle("GET /users", getUsersHandler);
     *
     * const mainRouter = new Router();
     * mainRouter.append("/api", apiRouter);
     * // Now GET /api/users routes to getUsersHandler
     */
    append(baseUrl: `/${string}`, router: Router<Context>, options?: HandlerOptions): Router<Context>;
    /**
     * Low-level method to register routes of any handler type.
     * @param {HandlerType} handlerType - The type of handler to register
     * @param {"*"|MethodPath|Array<MethodPath>} urls - URL patterns to match
     * @param {Handler<Context>|Pipeline<Context>} pipeline_ - Handler(s) to execute
     * @param {HandlerOptions} [options] - Registration options
     * @returns {Router<Context>} The router instance for chaining
     * @private
     */
    setRoutes(handlerType: HandlerType, urls: "*" | MethodPath | Array<MethodPath>, pipeline_: Handler<Context> | Pipeline<Context>, options?: HandlerOptions): Router<Context>;
    /**
     * Handles an incoming HTTP request and returns a response.
     * This is the main entry point for request processing.
     * Handlers are only called if they are not disabled.
     * @param {Request} req - The incoming HTTP request
     * @param {Partial<Context>} [context] - Initial context object
     * @returns {Promise<Response>} The HTTP response
     */
    respond(req: Request, context?: Partial<Context>): Promise<Response>;
}
export interface SplitURL {
    method: HttpMethod;
    pathname: HttpPath;
    nodes: string[];
    params: Map<number, {
        name: string;
        index: number;
    }>;
}
export default Router;
//# sourceMappingURL=router.d.ts.map