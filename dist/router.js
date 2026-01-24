"use strict";
/**
 * @file A fast radix-trie based router for JavaScript runtimes.
 * @module @bepalo/router
 * @author Natnael Eshetu
 * @exports Router
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _a, _Router_trees, _Router_enable, _Router_defaultHeaders, _Router_defaultCatcher, _Router_defaultFallback, _Router_setters, _Router_ALL_METHOD_PATHS;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Router = exports.isValidHttpMethod = void 0;
const tree_1 = require("./tree");
/**
 * Checks if a string is a valid HTTP method.
 * @param {string} method - The method string to validate
 * @returns {boolean} True if the method is valid, false otherwise
 */
const isValidHttpMethod = (method) => {
    switch (method) {
        case "HEAD":
        case "OPTIONS":
        case "GET":
        case "POST":
        case "PUT":
        case "PATCH":
        case "DELETE":
            return true;
        default:
            return false;
    }
};
exports.isValidHttpMethod = isValidHttpMethod;
/**
 * Initializes method trees for all HTTP methods.
 * @returns {Record<HttpMethod, Tree<RouteNode<Context>>>} Trees for each HTTP method
 * @template Context
 */
function initMethodTrees() {
    return {
        HEAD: new tree_1.Tree(),
        OPTIONS: new tree_1.Tree(),
        GET: new tree_1.Tree(),
        POST: new tree_1.Tree(),
        PUT: new tree_1.Tree(),
        PATCH: new tree_1.Tree(),
        DELETE: new tree_1.Tree(),
    };
}
/** @constant {Array} emptyArray - Empty array constant for optimization */
const emptyArray = [];
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
class Router {
    /**
     * Gets the routing trees for all handler types.
     * @returns {Record<HandlerType, Record<HttpMethod, Tree<RouteNode<Context>>>>}
     */
    get trees() {
        return __classPrivateFieldGet(this, _Router_trees, "f");
    }
    /**
     * Gets the enabled handler types configuration.
     * @returns {HandlerEnable}
     */
    get enabled() {
        return __classPrivateFieldGet(this, _Router_enable, "f");
    }
    /**
     * Gets the default headers configuration.
     * @returns {Array<HeaderTuple>|{():Array<HeaderTuple>}}
     */
    get defaultHeaders() {
        return typeof __classPrivateFieldGet(this, _Router_defaultHeaders, "f") === "function"
            ? __classPrivateFieldGet(this, _Router_defaultHeaders, "f").call(this)
            : __classPrivateFieldGet(this, _Router_defaultHeaders, "f");
    }
    /**
     * Gets the default catcher handler.
     * @returns {Handler<Context>|undefined}
     */
    get defaultCatcher() {
        return __classPrivateFieldGet(this, _Router_defaultCatcher, "f");
    }
    /**
     * Gets the default fallback handler.
     * @returns {Handler<Context>|undefined}
     */
    get defaultFallback() {
        return __classPrivateFieldGet(this, _Router_defaultFallback, "f");
    }
    /**
     * Gets the route registration history.
     * @returns {Set<HandlerSetter<Context>>}
     */
    get setters() {
        return __classPrivateFieldGet(this, _Router_setters, "f");
    }
    /**
     * Creates a new Router instance.
     * @param {RouterConfig<Context>} [config] - Configuration options
     */
    constructor(config) {
        _Router_trees.set(this, {
            filter: initMethodTrees(),
            hook: initMethodTrees(),
            handler: initMethodTrees(),
            fallback: initMethodTrees(),
            catcher: initMethodTrees(),
            after: initMethodTrees(),
        });
        _Router_enable.set(this, {
            hooks: true,
            afters: true,
            filters: true,
            fallbacks: true,
            catchers: true,
        });
        _Router_defaultHeaders.set(this, []);
        _Router_defaultCatcher.set(this, void 0);
        _Router_defaultFallback.set(this, void 0);
        _Router_setters.set(this, new Set());
        this.respond = this.respond.bind(this);
        if (config === null || config === void 0 ? void 0 : config.defaultHeaders) {
            __classPrivateFieldSet(this, _Router_defaultHeaders, config.defaultHeaders, "f");
        }
        if (config === null || config === void 0 ? void 0 : config.enable) {
            __classPrivateFieldSet(this, _Router_enable, config.enable, "f");
        }
        if (config === null || config === void 0 ? void 0 : config.defaultCatcher) {
            __classPrivateFieldSet(this, _Router_defaultCatcher, config.defaultCatcher, "f");
        }
        if (config === null || config === void 0 ? void 0 : config.defaultFallback) {
            __classPrivateFieldSet(this, _Router_defaultFallback, config.defaultFallback, "f");
        }
    }
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
    hook(urls, pipeline, options) {
        return this.setRoutes("hook", urls, pipeline, options);
    }
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
    after(urls, pipeline, options) {
        return this.setRoutes("after", urls, pipeline, options);
    }
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
    filter(urls, pipeline, options) {
        return this.setRoutes("filter", urls, pipeline, options);
    }
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
    handle(urls, pipeline, options) {
        return this.setRoutes("handler", urls, pipeline, options);
    }
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
    fallback(urls, pipeline, options) {
        return this.setRoutes("fallback", urls, pipeline, options);
    }
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
    catch(urls, pipeline, options) {
        return this.setRoutes("catcher", urls, pipeline, options);
    }
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
    append(baseUrl, router, options) {
        baseUrl =
            baseUrl.charAt(baseUrl.length - 1) === "/"
                ? baseUrl.slice(0, baseUrl.length - 1)
                : baseUrl;
        for (const elem of __classPrivateFieldGet(router, _Router_setters, "f")) {
            let urls;
            if (typeof elem.urls === "string") {
                const [method, path] = elem.urls.split(" ", 2);
                urls = `${method} ${baseUrl}${path}`;
            }
            else {
                urls = elem.urls.map((url) => {
                    const [method, path] = url.split(" ", 2);
                    return `${method} ${baseUrl}${path}`;
                });
            }
            this.setRoutes(elem.handlerType, urls, elem.pipeline, Object.assign(Object.assign({}, elem.options), options));
        }
        return this;
    }
    /**
     * Low-level method to register routes of any handler type.
     * @param {HandlerType} handlerType - The type of handler to register
     * @param {"*"|MethodPath|Array<MethodPath>} urls - URL patterns to match
     * @param {Handler<Context>|Pipeline<Context>} pipeline_ - Handler(s) to execute
     * @param {HandlerOptions} [options] - Registration options
     * @returns {Router<Context>} The router instance for chaining
     * @private
     */
    setRoutes(handlerType, urls, pipeline_, options) {
        const pipeline = Array.isArray(pipeline_)
            ? pipeline_
            : [pipeline_];
        const splitUrls = urls === "*" ? __classPrivateFieldGet(_a, _a, "f", _Router_ALL_METHOD_PATHS) : splitUrl(urls);
        for (const { method, nodes, params, pathname } of splitUrls) {
            const treeNode = __classPrivateFieldGet(this, _Router_trees, "f")[handlerType][method];
            const splitPaths = pathname.substring(1).split("/");
            const splitPathsLength_1 = splitPaths.length - 1;
            for (let i = 0; i < splitPathsLength_1; i++) {
                switch (splitPaths[i]) {
                    case "**":
                        throw new Error(`Super-glob '**' in the middle of pathname '${pathname}'. Should only be at the end.`);
                    case ".**":
                        throw new Error(`Super-glob '.**' in the middle of pathname '${pathname}'. Should only be at the end.`);
                    case ".*":
                        throw new Error(`glob '.*' in the middle of pathname '${pathname}'. Should only be at the end.`);
                }
            }
            if (!(options === null || options === void 0 ? void 0 : options.overwrite)) {
                const node = treeNode.get(splitPaths);
                if (node) {
                    const maxLen = Math.min(node.nodes.length, splitPaths.length);
                    const colliding = [];
                    for (let i = 0; i < maxLen; i++) {
                        if (node.nodes[i] === "*") {
                            if (splitPaths[i].startsWith(":") || splitPaths[i] === "*") {
                                colliding.unshift(i);
                            }
                            else {
                                break;
                            }
                        }
                        else if (node.nodes[i] === splitPaths[i]) {
                            colliding.unshift(i);
                        }
                    }
                    if (colliding.length > 0 && colliding[0] === maxLen - 1) {
                        throw new Error(`Overriding route '${node.pathname}' with '${pathname}'`);
                    }
                }
            }
            treeNode.set(nodes, {
                method,
                nodes,
                pipeline,
                pathname,
                params,
            });
        }
        // add to setters for later use
        __classPrivateFieldGet(this, _Router_setters, "f").add({
            handlerType,
            urls,
            pipeline: pipeline_,
            options,
        });
        return this;
    }
    /**
     * Handles an incoming HTTP request and returns a response.
     * This is the main entry point for request processing.
     * Handlers are only called if they are not disabled.
     * @param {Request} req - The incoming HTTP request
     * @param {Partial<Context>} [context] - Initial context object
     * @returns {Promise<Response>} The HTTP response
     */
    respond(req, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _b, _c, _d, _e;
            const method = req.method;
            if (!(0, exports.isValidHttpMethod)(method)) {
                return new Response("Method Not Allowed", {
                    status: 405,
                    statusText: "Method Not Allowed",
                    headers: (_b = context === null || context === void 0 ? void 0 : context.headers) !== null && _b !== void 0 ? _b : new Headers(this.defaultHeaders),
                });
            }
            let response = undefined;
            const url = new URL(req.url);
            const key = url.pathname
                .substring(1, url.pathname !== "/" && url.pathname.endsWith("/")
                ? url.pathname.length - 1
                : url.pathname.length)
                .split("/");
            const hookNodes = this.enabled.hooks
                ? __classPrivateFieldGet(this, _Router_trees, "f").hook[method].getAll(key)
                : emptyArray;
            const afterNodes = this.enabled.afters
                ? __classPrivateFieldGet(this, _Router_trees, "f").after[method].getAll(key)
                : emptyArray;
            const filterNodes = this.enabled.filters
                ? __classPrivateFieldGet(this, _Router_trees, "f").filter[method].getAll(key)
                : emptyArray;
            const handlerNodes = __classPrivateFieldGet(this, _Router_trees, "f").handler[method].getAll(key);
            const fallbackNodes = this.enabled.fallbacks
                ? __classPrivateFieldGet(this, _Router_trees, "f").fallback[method].getAll(key)
                : emptyArray;
            const catcherNodes = (this.enabled.catchers
                ? __classPrivateFieldGet(this, _Router_trees, "f").catcher[method].getAll(key)
                : emptyArray);
            const found = {
                hooks: hookNodes.length > 0,
                afters: afterNodes.length > 0,
                filters: filterNodes.length > 0,
                handlers: handlerNodes.length > 0,
                fallbacks: fallbackNodes.length > 0,
                catchers: catcherNodes.length > 0,
            };
            const ctx = Object.assign({ params: (_c = context === null || context === void 0 ? void 0 : context.params) !== null && _c !== void 0 ? _c : {}, headers: (_d = context === null || context === void 0 ? void 0 : context.headers) !== null && _d !== void 0 ? _d : new Headers(this.defaultHeaders), found }, context);
            try {
                // hooks
                if (found.hooks) {
                    const params = hookNodes[hookNodes.length - 1].params;
                    if (params) {
                        for (const [index, param] of params) {
                            ctx.params[param.name] = key[index];
                        }
                    }
                    let hookResponse = undefined;
                    for (const hookNode of hookNodes) {
                        for (const hook of hookNode.pipeline) {
                            hookResponse = yield hook(req, ctx);
                            if (hookResponse)
                                break;
                        }
                        if (hookResponse)
                            break;
                    }
                }
                // filters
                if (found.filters) {
                    const params = filterNodes[filterNodes.length - 1].params;
                    if (params) {
                        for (const [index, param] of params) {
                            ctx.params[param.name] = key[index];
                        }
                    }
                    for (const filterNode of filterNodes) {
                        for (const filter of filterNode.pipeline) {
                            response = yield filter(req, ctx);
                            if (response)
                                break;
                        }
                        if (response)
                            break;
                    }
                }
                // handlers
                if (found.handlers) {
                    const params = handlerNodes[handlerNodes.length - 1].params;
                    if (params) {
                        for (const [index, param] of params) {
                            ctx.params[param.name] = key[index];
                        }
                    }
                    if (!(response instanceof Response)) {
                        for (const handlerNode of handlerNodes) {
                            for (const handler of handlerNode.pipeline) {
                                response = yield handler(req, ctx);
                                if (response)
                                    break;
                            }
                            if (response)
                                break;
                        }
                    }
                }
                // fallbacks
                if (!(response instanceof Response)) {
                    if (found.fallbacks) {
                        const params = fallbackNodes[fallbackNodes.length - 1].params;
                        if (params) {
                            for (const [index, param] of params) {
                                ctx.params[param.name] = key[index];
                            }
                        }
                        for (const fallbackNode of fallbackNodes) {
                            for (const fallback of fallbackNode.pipeline) {
                                response = yield fallback(req, ctx);
                                if (response)
                                    break;
                            }
                            if (response)
                                break;
                        }
                    }
                }
                if (!(response instanceof Response) && __classPrivateFieldGet(this, _Router_defaultFallback, "f")) {
                    response = yield __classPrivateFieldGet(this, _Router_defaultFallback, "f").call(this, req, ctx);
                }
                // append context headers to response
                if (response instanceof Response) {
                    if (ctx.headers) {
                        for (const [key, value] of ctx.headers) {
                            response.headers.set(key, value);
                        }
                    }
                }
                if (response instanceof Response)
                    ctx.response = response;
                response =
                    (_e = (typeof response === "boolean" ? null : response)) !== null && _e !== void 0 ? _e : (found.handlers || found.fallbacks
                        ? new Response(null, {
                            status: 204,
                            statusText: "No Content",
                            headers: ctx.headers,
                        })
                        : new Response("Not Found", {
                            status: 404,
                            statusText: "Not Found",
                            headers: ctx.headers,
                        }));
                // after response handlers
                if (found.afters) {
                    const params = afterNodes[afterNodes.length - 1].params;
                    if (params) {
                        for (const [index, param] of params) {
                            ctx.params[param.name] = key[index];
                        }
                    }
                    let afterResponse = undefined;
                    for (const afterNode of afterNodes) {
                        for (const after of afterNode.pipeline) {
                            afterResponse = yield after(req, ctx);
                            if (afterResponse)
                                break;
                        }
                        if (afterResponse)
                            break;
                    }
                }
            }
            catch (error) {
                // error handlers
                ctx.error = error instanceof Error ? error : new Error(String(error));
                if (found.catchers) {
                    const params = catcherNodes[catcherNodes.length - 1].params;
                    if (params) {
                        for (const [index, param] of params) {
                            ctx.params[param.name] = key[index];
                        }
                    }
                    for (const catcherNode of catcherNodes) {
                        for (const catcher of catcherNode.pipeline) {
                            response = yield catcher(req, ctx);
                            if (response)
                                break;
                        }
                        if (response)
                            break;
                    }
                }
                if (!(response instanceof Response) && __classPrivateFieldGet(this, _Router_defaultCatcher, "f")) {
                    response = yield __classPrivateFieldGet(this, _Router_defaultCatcher, "f").call(this, req, ctx);
                }
                if (!(response instanceof Response)) {
                    response = new Response("Internal Server Error", {
                        status: 500,
                        statusText: "Internal Server Error",
                        headers: ctx.headers,
                    });
                }
            }
            return response;
        });
    }
}
exports.Router = Router;
_a = Router, _Router_trees = new WeakMap(), _Router_enable = new WeakMap(), _Router_defaultHeaders = new WeakMap(), _Router_defaultCatcher = new WeakMap(), _Router_defaultFallback = new WeakMap(), _Router_setters = new WeakMap();
_Router_ALL_METHOD_PATHS = { value: splitUrl([
        "HEAD /.**",
        "OPTIONS /.**",
        "GET /.**",
        "POST /.**",
        "PUT /.**",
        "PATCH /.**",
        "DELETE /.**",
    ]) };
/**
 * Splits URL patterns into their components for routing.
 * Supports wildcards (*), super-globs (**), and parameters (:param).
 * @param {MethodPath|Array<MethodPath>} urls - URL patterns to split
 * @returns {Array<SplitURL>} Array of split URL components
 * @private
 * @example
 * // Returns: [{ method: 'GET', pathname: '/users/:id', nodes: ['users', '*'], params: Map({1: {name: 'id', index: 1}}) }]
 * splitUrl(["GET /users/:id"]);
 */
function splitUrl(urls) {
    urls = (Array.isArray(urls) ? urls : [urls]);
    let splitUrls = [];
    for (const mp of urls) {
        const [method, pathname] = mp
            .split(" ", 2)
            .map((mu) => mu.trim());
        const params = new Map();
        const nodes = [];
        const pathNodes = pathname.substring(1).split("/");
        const lastPathNode = pathNodes.length > 0 && pathNodes[pathNodes.length - 1];
        // check the last path node to match '***'
        if (lastPathNode === ".**") {
            const curNodes = pathNodes.slice(0, pathNodes.length - 1);
            splitUrls.push({ method, pathname, nodes: [...curNodes, ""], params });
            splitUrls.push({ method, pathname, nodes: [...curNodes, "**"], params });
        }
        else if (lastPathNode === ".*") {
            const curNodes = pathNodes.splice(0, pathNodes.length - 1);
            splitUrls.push({ method, pathname, nodes: [...curNodes, ""], params });
            splitUrls.push({ method, pathname, nodes: [...curNodes, "*"], params });
        }
        else {
            // process the path nodes
            for (let index = 0; index < pathNodes.length; index++) {
                const pathNode = pathNodes[index];
                if (pathNode === ".**" && index < pathNodes.length - 1) {
                    throw new Error("Super-Glob not at the end of pathname");
                }
                if (pathNode.startsWith(":")) {
                    const name = pathNode.substring(1);
                    params.set(index, { name, index });
                    nodes.push("*");
                }
                else {
                    nodes.push(pathNode);
                }
            }
            splitUrls.push({ method, pathname, nodes, params });
        }
    }
    return splitUrls;
}
exports.default = Router;
//# sourceMappingURL=router.js.map