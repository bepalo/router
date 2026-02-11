/**
 * @file A fast radix-trie based router for JavaScript runtimes.
 * @module @bepalo/router
 * @author Natnael Eshetu
 * @exports Router
 */

import { Tree } from "./tree";
import type {
  HttpMethod,
  MethodPath,
  Pipeline,
  HandlerType,
  HttpPath,
  Handler,
  HeaderTuple,
  BoundHandler,
  CTXError,
} from "./types";

/**
 * Checks if a string is a valid HTTP method.
 * @param {string} method - The method string to validate
 * @returns {boolean} True if the method is valid, false otherwise
 */
export const isValidHttpMethod = (method: string): boolean => {
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
type RouteNode<Context = {}> = {
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
export type RouterContext<XContext = {}> = {
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
} & XContext;

/**
 * Initializes method trees for all HTTP methods.
 * @returns {Record<HttpMethod, Tree<RouteNode<Context>>>} Trees for each HTTP method
 * @template Context
 */
function initMethodTrees<Context = {}>(): Record<
  HttpMethod,
  Tree<RouteNode<Context>>
> {
  return {
    HEAD: new Tree<RouteNode<Context>>(),
    OPTIONS: new Tree<RouteNode<Context>>(),
    GET: new Tree<RouteNode<Context>>(),
    POST: new Tree<RouteNode<Context>>(),
    PUT: new Tree<RouteNode<Context>>(),
    PATCH: new Tree<RouteNode<Context>>(),
    DELETE: new Tree<RouteNode<Context>>(),
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
 * @property {Array<HeaderTuple>|{(): Array<HeaderTuple>}} [defaultHeaders] - Default headers to add to all responses
 * @property {Handler<Context>} [defaultCatcher] - Default error handler for uncaught exceptions
 * @property {Handler<Context>} [defaultFallback] - Default handler for unmatched routes
 * @property {HandlerEnable} [enable] - Configuration for enabling/disabling handler types
 * @template Context
 */
export interface RouterConfig<Context extends RouterContext = RouterContext> {
  defaultHeaders?: Array<HeaderTuple> | { (): Array<HeaderTuple> };
  defaultCatcher?: Handler<Context & CTXError>;
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
interface HandlerSetter<Context extends RouterContext = RouterContext> {
  handlerType: HandlerType;
  urls: "*" | MethodPath | Array<MethodPath>;
  pipeline: Handler<Context> | Pipeline<Context>;
  options?: HandlerOptions;
}

/** @constant {Array} emptyArray - Empty array constant for optimization */
const emptyArray: unknown[] = [];

/**
 * A fast radix-trie based router for JavaScript runtimes.
 * Supports hooks, filters, handlers, fallbacks, catchers, and after handlers.
 * @class
 * @template EXContext
 * @template Context extends RouterContext<EXContext>
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
export class Router<
  EXTContext = {},
  Context extends RouterContext<EXTContext> = RouterContext<EXTContext>,
> {
  #trees: Record<HandlerType, Record<HttpMethod, Tree<RouteNode<Context>>>> = {
    filter: initMethodTrees<Context>(),
    hook: initMethodTrees<Readonly<Context>>(),
    handler: initMethodTrees<Context>(),
    fallback: initMethodTrees<Context>(),
    catcher: initMethodTrees<Context>(),
    after: initMethodTrees<Context>(),
  };
  #enable: HandlerEnable = {
    hooks: true,
    afters: true,
    filters: true,
    fallbacks: true,
    catchers: true,
  };
  #defaultHeaders: Array<HeaderTuple> | { (): Array<HeaderTuple> } = [];
  #defaultCatcher?: Handler<Context & CTXError>;
  #defaultFallback?: Handler<Context>;
  #setters: Set<HandlerSetter<Context>> = new Set();

  static #ALL_METHOD_PATHS = splitUrl([
    "HEAD /.**",
    "OPTIONS /.**",
    "GET /.**",
    "POST /.**",
    "PUT /.**",
    "PATCH /.**",
    "DELETE /.**",
  ]);

  /**
   * Gets the routing trees for all handler types.
   * @returns {Record<HandlerType, Record<HttpMethod, Tree<RouteNode<Context>>>>}
   */
  get trees(): Record<
    HandlerType,
    Record<HttpMethod, Tree<RouteNode<Context>>>
  > {
    return this.#trees;
  }

  /**
   * Gets the enabled handler types configuration.
   * @returns {HandlerEnable}
   */
  get enabled(): HandlerEnable {
    return this.#enable;
  }

  /**
   * Gets the default headers configuration.
   * @returns {Array<HeaderTuple>|{():Array<HeaderTuple>}}
   */
  get defaultHeaders(): Array<HeaderTuple> {
    return typeof this.#defaultHeaders === "function"
      ? this.#defaultHeaders()
      : this.#defaultHeaders;
  }

  /**
   * Gets the default catcher handler.
   * @returns {Handler<Context>|undefined}
   */
  get defaultCatcher(): Handler<Context & CTXError> | undefined {
    return this.#defaultCatcher;
  }

  /**
   * Gets the default fallback handler.
   * @returns {Handler<Context>|undefined}
   */
  get defaultFallback(): Handler<Context> | undefined {
    return this.#defaultFallback;
  }

  /**
   * Gets the route registration history.
   * @returns {Set<HandlerSetter<Context>>}
   */
  get setters(): Set<HandlerSetter<Context>> {
    return this.#setters;
  }

  /**
   * Creates a new Router instance.
   * @param {RouterConfig<Context>} [config] - Configuration options
   */
  constructor(config?: RouterConfig<Context>) {
    this.respond = this.respond.bind(this);
    if (config?.defaultHeaders) {
      this.#defaultHeaders = config.defaultHeaders;
    }
    if (config?.enable) {
      this.#enable = config.enable;
    }
    if (config?.defaultCatcher) {
      this.#defaultCatcher = config.defaultCatcher;
    }
    if (config?.defaultFallback) {
      this.#defaultFallback = config.defaultFallback;
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
  hook<XContext = {}>(
    urls: "*" | MethodPath | Array<MethodPath>,
    pipeline: Handler<Context & XContext> | Pipeline<Context & XContext>,
    options?: HandlerOptions,
  ): Router<Context & XContext> {
    return this.setRoutes(
      "hook",
      urls,
      pipeline as unknown as Handler<Context> | Pipeline<Context>,
      options,
    );
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
  after<XContext = {}>(
    urls: "*" | MethodPath | Array<MethodPath>,
    pipeline: Handler<Context & XContext> | Pipeline<Context & XContext>,
    options?: HandlerOptions,
  ): Router<Context & XContext> {
    return this.setRoutes(
      "after",
      urls,
      pipeline as unknown as Handler<Context> | Pipeline<Context>,
      options,
    );
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
  filter<XContext = {}>(
    urls: "*" | MethodPath | Array<MethodPath>,
    pipeline: Handler<Context & XContext> | Pipeline<Context & XContext>,
    options?: HandlerOptions,
  ): Router<Context & XContext> {
    return this.setRoutes(
      "filter",
      urls,
      pipeline as unknown as Handler<Context> | Pipeline<Context>,
      options,
    );
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
  handle<XContext = {}>(
    urls: "*" | MethodPath | Array<MethodPath>,
    pipeline: Handler<Context & XContext> | Pipeline<Context & XContext>,
    options?: HandlerOptions,
  ): Router<Context & XContext> {
    return this.setRoutes(
      "handler",
      urls,
      pipeline as unknown as Handler<Context> | Pipeline<Context>,
      options,
    );
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
  fallback<XContext = {}>(
    urls: "*" | MethodPath | Array<MethodPath>,
    pipeline: Handler<Context & XContext> | Pipeline<Context & XContext>,
    options?: HandlerOptions,
  ): Router<Context & XContext> {
    return this.setRoutes(
      "fallback",
      urls,
      pipeline as unknown as Handler<Context> | Pipeline<Context>,
      options,
    );
  }

  /**
   * Registers an error handler for catching exceptions.
   * Catchers receive the error in the context and can return a response.
   * @param {"*"|MethodPath|Array<MethodPath>} urls - URL patterns to match
   * @param {Handler<Context & XContext & CTXError>|Pipeline<Context & XContext & CTXError>} pipeline - Handler(s) to execute
   * @param {HandlerOptions} [options] - Registration options
   * @returns {Router<Context & XContext & CTXError>} The router instance for chaining
   * @template XContext
   * @example
   * router.catch("GET /**", (req, ctx) => {
   *   console.error(ctx.error);
   *   return json({ error: "Internal server error" }, { status: 500 });
   * });
   */
  catch<XContext = {}>(
    urls: "*" | MethodPath | Array<MethodPath>,
    pipeline:
      | Handler<Context & XContext & CTXError>
      | Pipeline<Context & XContext & CTXError>,
    options?: HandlerOptions,
  ): Router<Context & XContext & CTXError> {
    return this.setRoutes(
      "catcher",
      urls,
      pipeline as unknown as Handler<Context> | Pipeline<Context>,
      options,
    );
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
  append(
    baseUrl: `/${string}`,
    router: Router<Context>,
    options?: HandlerOptions,
  ): Router<Context> {
    baseUrl =
      baseUrl.charAt(baseUrl.length - 1) === "/"
        ? (baseUrl.slice(0, baseUrl.length - 1) as `/${string}`)
        : baseUrl;
    for (const elem of router.#setters) {
      let urls: "*" | MethodPath | Array<MethodPath>;
      if (typeof elem.urls === "string") {
        const [method, path] = elem.urls.split(" ", 2);
        urls = `${method} ${baseUrl}${path}` as MethodPath;
      } else {
        urls = elem.urls.map((url: MethodPath) => {
          const [method, path] = url.split(" ", 2);
          return `${method} ${baseUrl}${path}` as MethodPath;
        });
      }
      this.setRoutes(elem.handlerType, urls, elem.pipeline, {
        ...elem.options,
        ...options,
      });
    }
    return this;
  }

  /**
   * Low-level method to register routes of any handler type.
   * @param {HandlerType} handlerType - The type of handler to register
   * @param {"*"|MethodPath|Array<MethodPath>} urls - URL patterns to match
   * @param {Handler<Context>|Pipeline<Context>|Handler<Context&CTXError>|Pipeline<Context&CTXError>} pipeline_ - Handler(s) to execute
   * @param {HandlerOptions} [options] - Registration options
   * @returns {Router<Context>} The router instance for chaining
   * @private
   */
  setRoutes(
    handlerType: HandlerType,
    urls: "*" | MethodPath | Array<MethodPath>,
    pipeline_:
      | Handler<Context>
      | Pipeline<Context>
      | Handler<Context & CTXError>
      | Pipeline<Context & CTXError>,
    options?: HandlerOptions,
  ): Router<Context> {
    const pipeline: Pipeline<Context> | Pipeline<Context & CTXError> =
      Array.isArray(pipeline_)
        ? pipeline_
        : ([pipeline_] as Pipeline<Context> | Pipeline<Context & CTXError>);
    const splitUrls = urls === "*" ? Router.#ALL_METHOD_PATHS : splitUrl(urls);
    for (const { method, nodes, params, pathname } of splitUrls) {
      const treeNode = this.#trees[handlerType][method];
      const splitPaths = pathname.substring(1).split("/");
      const splitPathsLength_1 = splitPaths.length - 1;
      for (let i = 0; i < splitPathsLength_1; i++) {
        switch (splitPaths[i]) {
          case "**":
            throw new Error(
              `Super-glob '**' in the middle of pathname '${pathname}'. Should only be at the end.`,
            );
          case ".**":
            throw new Error(
              `Super-glob '.**' in the middle of pathname '${pathname}'. Should only be at the end.`,
            );
          case ".*":
            throw new Error(
              `glob '.*' in the middle of pathname '${pathname}'. Should only be at the end.`,
            );
        }
      }
      if (!options?.overwrite) {
        const node = treeNode.get(splitPaths);
        if (node) {
          const maxLen = Math.min(node.nodes.length, splitPaths.length);
          const colliding: number[] = [];
          for (let i = 0; i < maxLen; i++) {
            if (node.nodes[i] === "*") {
              if (splitPaths[i].startsWith(":") || splitPaths[i] === "*") {
                colliding.unshift(i);
              } else {
                break;
              }
            } else if (node.nodes[i] === splitPaths[i]) {
              colliding.unshift(i);
            }
          }
          if (colliding.length > 0 && colliding[0] === maxLen - 1) {
            throw new Error(
              `Overriding route '${node.pathname}' with '${pathname}'`,
            );
          }
        }
      }
      treeNode.set(nodes, {
        method,
        nodes,
        pipeline: pipeline as Pipeline<Context>,
        pathname,
        params,
      });
    }
    // add to setters for later use
    this.#setters.add({
      handlerType,
      urls,
      pipeline: pipeline_ as Pipeline<Context>,
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
  async respond(req: Request, context?: Partial<Context>): Promise<Response> {
    const method = req.method as HttpMethod;
    if (!isValidHttpMethod(method)) {
      return new Response("Method Not Allowed", {
        status: 405,
        statusText: "Method Not Allowed",
        headers: context?.headers ?? new Headers(this.defaultHeaders),
      });
    }
    let response: void | boolean | Response = undefined;
    const url = new URL(req.url);
    const key = url.pathname
      .substring(
        1,
        url.pathname !== "/" && url.pathname.endsWith("/")
          ? url.pathname.length - 1
          : url.pathname.length,
      )
      .split("/");
    const hookNodes = this.enabled.hooks
      ? this.#trees.hook[method].getAll(key)
      : (emptyArray as RouteNode<Context>[]);
    const afterNodes = this.enabled.afters
      ? this.#trees.after[method].getAll(key)
      : (emptyArray as RouteNode<Context>[]);
    const filterNodes = this.enabled.filters
      ? this.#trees.filter[method].getAll(key)
      : (emptyArray as RouteNode<Context>[]);
    const handlerNodes = this.#trees.handler[method].getAll(key);
    const fallbackNodes = this.enabled.fallbacks
      ? this.#trees.fallback[method].getAll(key)
      : (emptyArray as RouteNode<Context>[]);
    const catcherNodes = (
      this.enabled.catchers
        ? this.#trees.catcher[method].getAll(key)
        : emptyArray
    ) as RouteNode<Context & CTXError>[];
    const found = {
      hooks: hookNodes.length > 0,
      afters: afterNodes.length > 0,
      filters: filterNodes.length > 0,
      handlers: handlerNodes.length > 0,
      fallbacks: fallbackNodes.length > 0,
      catchers: catcherNodes.length > 0,
    };
    const ctx = {
      params: context?.params ?? {},
      headers: context?.headers ?? new Headers(this.defaultHeaders),
      found,
      ...context,
    } as Context;
    try {
      // hooks
      if (found.hooks) {
        const params = hookNodes[0].params;
        if (params) {
          for (const [index, param] of params) {
            ctx.params[param.name] = key[index];
          }
        }
        let hookResponse: void | boolean | Response = undefined;
        for (const hookNode of hookNodes) {
          for (const hook of hookNode.pipeline) {
            hookResponse = await (hook as BoundHandler<Context>).bind(this)(
              req,
              ctx,
            );
            if (hookResponse) break;
          }
          if (hookResponse) break;
        }
      }
      // filters
      if (found.filters) {
        const params = filterNodes[0].params;
        if (params) {
          for (const [index, param] of params) {
            ctx.params[param.name] = key[index];
          }
        }
        for (const filterNode of filterNodes) {
          for (const filter of filterNode.pipeline) {
            response = await (filter as BoundHandler<Context>).bind(this)(
              req,
              ctx,
            );
            if (response) break;
          }
          if (response) break;
        }
      }
      // handlers
      if (found.handlers) {
        const params = handlerNodes[0].params;
        if (params) {
          for (const [index, param] of params) {
            ctx.params[param.name] = key[index];
          }
        }
        if (!(response instanceof Response)) {
          for (const handlerNode of handlerNodes) {
            for (const handler of handlerNode.pipeline) {
              response = await (handler as BoundHandler<Context>).bind(this)(
                req,
                ctx,
              );
              if (response) break;
            }
            if (response) break;
          }
        }
      }
      // fallbacks
      if (!(response instanceof Response)) {
        if (found.fallbacks) {
          const params = fallbackNodes[0].params;
          if (params) {
            for (const [index, param] of params) {
              ctx.params[param.name] = key[index];
            }
          }
          for (const fallbackNode of fallbackNodes) {
            for (const fallback of fallbackNode.pipeline) {
              response = await (fallback as BoundHandler<Context>).bind(this)(
                req,
                ctx,
              );
              if (response) break;
            }
            if (response) break;
          }
        }
      }
      if (!(response instanceof Response) && this.#defaultFallback) {
        response = await this.#defaultFallback(req, ctx);
      }
      // append context headers to response
      if (response instanceof Response) {
        if (ctx.headers) {
          for (const [key, value] of ctx.headers) {
            response.headers.set(key, value);
          }
        }
      }
      if (response instanceof Response) ctx.response = response;
      response =
        (typeof response === "boolean" ? null : response) ??
        (found.handlers || found.fallbacks
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
        const params = afterNodes[0].params;
        if (params) {
          for (const [index, param] of params) {
            ctx.params[param.name] = key[index];
          }
        }
        let afterResponse: void | boolean | Response = undefined;
        for (const afterNode of afterNodes) {
          for (const after of afterNode.pipeline) {
            afterResponse = await (after as BoundHandler<Context>).bind(this)(
              req,
              ctx,
            );
            if (afterResponse) break;
          }
          if (afterResponse) break;
        }
      }
    } catch (error) {
      // error handlers
      ctx.error = error instanceof Error ? error : new Error(String(error));
      if (found.catchers) {
        const params = catcherNodes[0].params;
        if (params) {
          for (const [index, param] of params) {
            ctx.params[param.name] = key[index];
          }
        }
        for (const catcherNode of catcherNodes) {
          for (const catcher of catcherNode.pipeline) {
            response = await (catcher as BoundHandler<Context>).bind(this)(
              req,
              ctx as Context & CTXError,
            );
            if (response) break;
          }
          if (response) break;
        }
      }
      if (!(response instanceof Response) && this.#defaultCatcher) {
        response = await this.#defaultCatcher(req, ctx as Context & CTXError);
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
  }
}

export interface SplitURL {
  method: HttpMethod;
  pathname: HttpPath;
  nodes: string[];
  params: Map<
    number,
    {
      name: string;
      index: number;
    }
  >;
}

export const ALL_METHODS: HttpMethod[] = [
  "HEAD",
  "OPTIONS",
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
];

export const CRUD_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
];

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
function splitUrl(urls: MethodPath | Array<MethodPath>): Array<SplitURL> {
  urls = (Array.isArray(urls) ? urls : [urls]) as Array<MethodPath>;
  let splitUrls: Array<SplitURL> = [];
  for (const mp of urls) {
    const [_method, pathname] = mp
      .split(" ", 2)
      .map((mu: string) => mu.trim()) as [
      HttpMethod | "ALL" | "CRUD",
      HttpPath,
    ];
    const params: Map<number, { name: string; index: number }> = new Map();
    const nodes: Array<string> = [];
    const pathNodes = pathname.substring(1).split("/");
    const lastPathNode =
      pathNodes.length > 0 && pathNodes[pathNodes.length - 1];
    const methods =
      _method === "ALL"
        ? ALL_METHODS
        : _method === "CRUD"
          ? CRUD_METHODS
          : [_method];
    for (const method of methods) {
      // check the last path node to match globs '.**'
      if (lastPathNode === ".**") {
        const curNodes = pathNodes.slice(0, pathNodes.length - 1);
        splitUrls.push({ method, pathname, nodes: [...curNodes, ""], params });
        splitUrls.push({
          method,
          pathname,
          nodes: [...curNodes, "**"],
          params,
        });
      } else if (lastPathNode === ".*") {
        const curNodes = pathNodes.splice(0, pathNodes.length - 1);
        splitUrls.push({ method, pathname, nodes: [...curNodes, ""], params });
        splitUrls.push({ method, pathname, nodes: [...curNodes, "*"], params });
      } else {
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
          } else {
            nodes.push(pathNode);
          }
        }
        splitUrls.push({ method, pathname, nodes, params });
      }
    }
  }
  return splitUrls;
}

export default Router;
