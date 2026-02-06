import Router, { RouterContext } from "./router";
import { Handler, HandlerType, HttpMethod, MethodPath } from "./types";

export * from "./upload-stream";

export interface SocketAddress {
  address: string;
  family: string;
  port: number;
}

export type CTXError = { error: Error };

export type CTXAddress = { address: SocketAddress };

export function getHttpStatusText(code: number): string {
  switch (code) {
    // 1xx Informational
    case 100:
      return "Continue";
    case 101:
      return "Switching Protocols";
    case 102:
      return "Processing";
    case 103:
      return "Early Hints";

    // 2xx Success
    case 200:
      return "OK";
    case 201:
      return "Created";
    case 202:
      return "Accepted";
    case 203:
      return "Non-Authoritative Information";
    case 204:
      return "No Content";
    case 205:
      return "Reset Content";
    case 206:
      return "Partial Content";
    case 207:
      return "Multi-Status";
    case 208:
      return "Already Reported";
    case 226:
      return "IM Used";

    // 3xx Redirection
    case 300:
      return "Multiple Choices";
    case 301:
      return "Moved Permanently";
    case 302:
      return "Found";
    case 303:
      return "See Other";
    case 304:
      return "Not Modified";
    case 305:
      return "Use Proxy";
    case 307:
      return "Temporary Redirect";
    case 308:
      return "Permanent Redirect";

    // 4xx Client Error
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 402:
      return "Payment Required";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 405:
      return "Method Not Allowed";
    case 406:
      return "Not Acceptable";
    case 407:
      return "Proxy Authentication Required";
    case 408:
      return "Request Timeout";
    case 409:
      return "Conflict";
    case 410:
      return "Gone";
    case 411:
      return "Length Required";
    case 412:
      return "Precondition Failed";
    case 413:
      return "Payload Too Large";
    case 414:
      return "URI Too Long";
    case 415:
      return "Unsupported Media Type";
    case 416:
      return "Range Not Satisfiable";
    case 417:
      return "Expectation Failed";
    case 418:
      return "I'm a teapot";
    case 421:
      return "Misdirected Request";
    case 422:
      return "Unprocessable Entity";
    case 423:
      return "Locked";
    case 424:
      return "Failed Dependency";
    case 425:
      return "Too Early";
    case 426:
      return "Upgrade Required";
    case 428:
      return "Precondition Required";
    case 429:
      return "Too Many Requests";
    case 431:
      return "Request Header Fields Too Large";
    case 451:
      return "Unavailable For Legal Reasons";

    // 5xx Server Error
    case 500:
      return "Internal Server Error";
    case 501:
      return "Not Implemented";
    case 502:
      return "Bad Gateway";
    case 503:
      return "Service Unavailable";
    case 504:
      return "Gateway Timeout";
    case 505:
      return "HTTP Version Not Supported";
    case 506:
      return "Variant Also Negotiates";
    case 507:
      return "Insufficient Storage";
    case 508:
      return "Loop Detected";
    case 510:
      return "Not Extended";
    case 511:
      return "Network Authentication Required";

    // Unofficial/Custom codes
    case 419:
      return "Page Expired"; // Laravel Framework
    case 420:
      return "Enhance Your Calm"; // Twitter
    case 430:
      return "Request Header Fields Too Large"; // Shopify
    case 450:
      return "Blocked by Windows Parental Controls"; // Microsoft
    case 498:
      return "Invalid Token"; // Esri
    case 499:
      return "Token Required"; // Esri
    case 509:
      return "Bandwidth Limit Exceeded"; // Apache
    case 526:
      return "Invalid SSL Certificate"; // Cloudflare
    case 529:
      return "Site is overloaded"; // Qualys
    case 530:
      return "Site is frozen"; // Pantheon
    case 598:
      return "Network Read Timeout Error"; // Informal convention
    case 599:
      return "Network Connect Timeout Error"; // Informal convention

    default:
      // Categorize unknown codes
      if (code >= 100 && code < 200) return "Informational Response";
      if (code >= 200 && code < 300) return "Successful Response";
      if (code >= 300 && code < 400) return "Redirection Message";
      if (code >= 400 && code < 500) return "Client Error Response";
      if (code >= 500 && code < 600) return "Server Error Response";
      return "Unknown Status Code";
  }
}

/**
 * Creates a Response with the specified status code.
 * Defaults to text/plain content-type if not provided in init.headers.
 * @param {number} status - The HTTP status code
 * @param {string|null} [content] - The response body content
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object
 * @example
 * status(200, "Success");
 * status(404, "Not Found");
 * status(204, null); // No content response
 */
export const status = (
  status: number,
  content?: string | null,
  init?: ResponseInit,
): Response => {
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (content !== null && !headers.has("content-type")) {
    headers.set("content-type", "text/plain");
  }
  return new Response(content !== undefined ? content : statusText, {
    statusText,
    ...init,
    status,
    headers,
  });
};

/**
 * Creates a redirect Response.
 * Defaults to 302 Found unless another status is provided.
 * @param {string} location - The URL to redirect to
 * @param {number} [code=302] - The HTTP status code (301, 302, 303, 307, 308)
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
export const redirect = (location: string, init?: ResponseInit): Response => {
  const status = init?.status ?? 302;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  headers.set("Location", location);
  return new Response(null, {
    statusText,
    ...init,
    status,
    headers,
  });
};

/**
 * Forwards the request to another handler internally.
 * Does not change the URL or send a redirect to the client.
 * @param {string} path - The new path to forward to
 * @returns {Response} A Response object with the forwarded request's response
 */
export const forward = <XContext = {}>(
  path: string,
  options?: {
    method: string;
  },
): Handler<RouterContext<XContext>> => {
  return async function (this: Router<XContext>, req, ctx) {
    const url = new URL(req.url);
    url.pathname = path;
    const newReq = new Request(url.toString(), {
      method: options?.method ?? req.method,
      headers: req.headers,
      body: req.body ? req.clone().body : undefined,
    });
    return this.respond(newReq, ctx);
  };
};

/**
 * Creates a text/plain Response.
 * Defaults to status 200 and text/plain content-type if not specified.
 * @param {string} content - The text content to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with text/plain content-type
 * @example
 * text("Hello, world!");
 * text("Error occurred", { status: 500 });
 */
export const text = (content: string, init?: ResponseInit): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/plain");
  }
  return new Response(content, {
    statusText,
    ...init,
    status,
    headers,
  });
};

/**
 * Creates an HTML Response.
 * Defaults to status 200 and text/html content-type if not specified.
 * @param {string} content - The HTML content to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with text/html content-type
 * @example
 * html("<h1>Hello</h1>");
 * html("<p>Not Found</p>", { status: 404 });
 */
export const html = (content: string, init?: ResponseInit): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/html");
  }
  return new Response(content, {
    statusText,
    ...init,
    status,
    headers,
  });
};

/**
 * Creates a JSON Response.
 * Defaults to status 200 and application/json content-type if not specified.
 * Uses Response.json() internally which automatically serializes the body.
 * @param {any} body - The data to serialize as JSON
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with application/json content-type
 * @example
 * json({ message: "Success" });
 * json({ error: "Not found" }, { status: 404 });
 */
export const json = (body: any, init?: ResponseInit): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return Response.json(body, {
    statusText,
    ...init,
    status,
    headers,
  });
};

/**
 * Creates a Response from a Blob.
 * Automatically sets content-type from blob.type or defaults to application/octet-stream.
 * Also sets content-length header.
 * @param {Blob} blob - The blob data to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with appropriate content-type
 * @example
 * const blob = new Blob(["file content"], { type: "text/plain" });
 * blob(blob);
 */
export const blob = (blob: Blob, init?: ResponseInit): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", blob.type || "application/octet-stream");
  }
  headers.set("content-length", blob.size.toFixed());
  return new Response(blob, {
    statusText,
    ...init,
    status,
    headers,
  });
};

/**
 * Creates a Response from a Blob or ArrayBuffer with application/octet-stream content-type.
 * Forces octet-stream content-type.
 * Also sets content-length header.
 * @param {Blob|ArrayBuffer} octetStream - The blob data to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with application/octet-stream content-type
 * @example
 * const blob = new Blob([binaryData]);
 * octetStream(blob);
 */
export const octetStream = (
  octet: Blob | ArrayBuffer | ReadableStream,
  init?: ResponseInit,
): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }
  if (!(octet instanceof ReadableStream)) {
    headers.set(
      "content-length",
      (octet instanceof Blob ? octet.size : octet.byteLength).toFixed(),
    );
  }
  return new Response(octet, {
    statusText,
    ...init,
    status,
    headers,
  });
};

/**
 * Creates a Response from FormData.
 * @param {FormData} [formData] - The form data to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object
 * @example
 * const form = new FormData();
 * form.append("key", "value");
 * formData(form);
 */
export const formData = (
  formData?: FormData,
  init?: ResponseInit,
): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  return new Response(formData, {
    statusText,
    ...init,
    status,
  });
};

/**
 * Creates a Response from URLSearchParams with application/x-www-form-urlencoded content-type.
 * @param {URLSearchParams} [usp] - The URL search parameters to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with application/x-www-form-urlencoded content-type
 * @example
 * const params = new URLSearchParams({ q: "search term" });
 * usp(params);
 */
export const usp = (usp?: URLSearchParams, init?: ResponseInit): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/x-www-form-urlencoded");
  }
  return new Response(usp, {
    statusText,
    ...init,
    status,
    headers,
  });
};

/**
 * Creates a Response from various body types with automatic content-type detection.
 * Supports strings, objects (JSON), Blobs, ArrayBuffers, FormData, URLSearchParams, and ReadableStreams.
 * @param {BodyInit} [body] - The body content to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with appropriate content-type
 * @example
 * send("text"); // text/plain
 * send({ message: "success" }); // application/json
 * send(new Blob([])); // blob.type || application/octet-stream
 * send(new FormData()); // multipart/form-data
 * send(new URLSearchParams()); // application/x-www-form-urlencoded
 */
export const send = (body?: BodyInit, init?: ResponseInit): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (body != null && !headers.has("content-type")) {
    if (body instanceof URLSearchParams) {
      headers.set("content-type", "application/x-www-form-urlencoded");
      body = body.toString();
    } else if (body instanceof FormData) {
    } else if (typeof body === "string") {
      headers.set("content-type", "text/plain; charset=utf-8");
    } else if (body instanceof Blob) {
      headers.set("content-type", body.type || "application/octet-stream");
    } else if (body instanceof ArrayBuffer) {
      headers.set("content-type", "application/octet-stream");
    } else if (!(body instanceof ReadableStream)) {
      headers.set("content-type", "application/json");
      return Response.json(body, {
        status,
        statusText,
        ...init,
        headers,
      });
    } else {
      headers.set("content-type", "application/octet-stream");
    }
  }
  return new Response(body, {
    statusText,
    ...init,
    status,
    headers,
  });
};

/**
 * Options for setting cookies.
 * @typedef {Object} CookieOptions
 * @property {string} [path] - The path for which the cookie is valid
 * @property {string} [domain] - The domain for which the cookie is valid
 * @property {Date|number|string} [expires] - Expiration date of the cookie
 * @property {number} [maxAge] - Maximum age of the cookie in seconds
 * @property {boolean} [httpOnly] - If true, the cookie is not accessible via JavaScript
 * @property {boolean} [secure] - If true, the cookie is only sent over HTTPS
 * @property {"Strict"|"Lax"|"None"} [sameSite] - SameSite attribute for the cookie
 */
export interface CookieOptions {
  path?: string;
  domain?: string;
  expires?: Date | number | string;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

/**
 * Tuple representing a cookie header (key-value pair for Set-Cookie header).
 * @typedef {[string, string]} CookieTuple
 */
type CookieTuple = [string, string];

/**
 * Creates a Set-Cookie header tuple with the given name, value, and options.
 * @param {string} name - The name of the cookie
 * @param {string} value - The value of the cookie
 * @param {CookieOptions} [options] - Cookie configuration options
 * @returns {CookieTuple} A tuple containing the header name "Set-Cookie" and the cookie string
 * @example
 * const cookie = setCookie("session", "abc123", { httpOnly: true, secure: true });
 * // Returns: ["Set-Cookie", "session=abc123; HttpOnly; Secure"]
 */
export const setCookie = (
  name: string,
  value: string,
  options?: CookieOptions,
): CookieTuple => {
  const parts = [`${name}=${value}`];
  if (options) {
    if (options.path) parts.push(`Path=${options.path}`);
    if (options.domain) parts.push(`Domain=${options.domain}`);
    if (options.expires)
      parts.push(`Expires=${new Date(options.expires).toUTCString()}`);
    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    if (options.httpOnly) parts.push(`HttpOnly`);
    if (options.secure) parts.push(`Secure`);
    if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  }
  const cookie = parts.join("; ");
  return ["Set-Cookie", cookie];
};

/**
 * Creates a Set-Cookie header tuple to clear/remove a cookie.
 * Sets the cookie with an empty value and an expired date.
 * @param {string} name - The name of the cookie to clear
 * @param {CookieOptions} [options] - Cookie configuration options (path/domain must match original cookie)
 * @returns {CookieTuple} A tuple containing the header name "Set-Cookie" and the cookie clearing string
 * @example
 * const cookie = clearCookie("session", { path: "/" });
 * // Returns: ["Set-Cookie", "session=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/"]
 */
export const clearCookie = (
  name: string,
  options?: CookieOptions,
): CookieTuple => {
  const parts = [`${name}=`];
  const expires = options?.expires
    ? new Date(options.expires).toUTCString()
    : "Thu, 01 Jan 1970 00:00:00 GMT";
  if (options) {
    if (options.path) parts.push(`Path=${options.path}`);
    if (options.domain) parts.push(`Domain=${options.domain}`);
    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    if (options.httpOnly) parts.push(`HttpOnly`);
    if (options.secure) parts.push(`Secure`);
    if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  }
  if (expires) parts.push(`Expires=${expires}`);
  const cookie = parts.join("; ");
  return ["Set-Cookie", cookie];
};

/**
 * Parses cookies from a Request object's Cookie header.
 * @template {Record<string, string>} Expected
 * @param {Request} req - The request object containing cookies
 * @returns {Expected|undefined} An object with cookie name-value pairs, or undefined if no cookies
 * @example
 * const cookies = parseCookieFromRequest(req);
 * // Returns: { session: "abc123", theme: "dark" }
 */
export const parseCookieFromRequest = <Expected extends Record<string, string>>(
  req: Request,
): Expected | undefined => {
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader != null) {
    const cookies: Record<string, string> = {};
    for (const pair of cookieHeader.split(";")) {
      const [rawName, rawValue, extra] = pair
        .trim()
        .split("=", 3)
        .map((token) => token.trim());
      if (
        rawName &&
        rawValue !== undefined &&
        rawValue !== "" &&
        extra === undefined
      ) {
        cookies[rawName] = decodeURIComponent(rawValue);
      }
    }
    return cookies as Expected;
  }
  return undefined;
};

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
export const parseCookie = <Context extends CTXCookie>(): Handler<Context> => {
  return (req: Request, ctx: Context) => {
    const cookie = parseCookieFromRequest(req) ?? {};
    ctx.cookie = cookie;
  };
};

/**
 * Context object containing parsed request body.
 * @typedef {Object} CTXBody
 * @property {Record<string, unknown>} body - Parsed request body data
 */
export type CTXBody = {
  body: Record<string, unknown>;
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
 * @returns {Function} A middleware function that adds parsed body to context.body
 * @throws {Response} Returns a 415 response if content-type is not accepted
 * @throws {Response} Returns a 413 response if body exceeds maxSize
 * @throws {Response} Returns a 400 response if body is malformed
 * @example
 * const bodyParser = parseBody({ maxSize: 5000 });
 * // Use in respondWith: respondWith({}, bodyParser(), ...otherHandlers)
 */
export const parseBody = <Context extends CTXBody>(options?: {
  accept?: SupportedBodyMediaTypes | SupportedBodyMediaTypes[]; // defaults to all
  maxSize?: number; // in bytes
}): Handler<Context> => {
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
  return async (req: Request, ctx: Context) => {
    const contentType = req.headers.get("content-type")?.split(";", 2)[0];
    if (!(contentType && accept.includes(contentType))) {
      await req.body?.cancel().catch(() => {});
      return status(415);
    }
    try {
      const contentLengthHeader = req.headers.get("content-length");
      if (!contentLengthHeader || parseInt(contentLengthHeader) > maxSize) {
        await req.body?.cancel().catch(() => {});
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
          ctx.body =
            typeof body === "object" ? (body as Record<string, unknown>) : {};
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
    } catch {
      await req.body?.cancel().catch(() => {});
      return status(400, "Malformed Payload");
    }
  };
};

/**
 * Request handler function type.
 * @callback RequestHandler
 * @template Context
 * @param {Request} req - The incoming request
 * @param {Context} ctx - The request context
 * @returns {Response|void|Promise<Response|void>} A Response, or void to continue to next handler
 */
export interface RequestHandler<Context = any> {
  (req: Request, ctx: Context): Response | void | Promise<Response | void>;
}

/**
 * Request handler with error, function type.
 * @callback RequestErrorHandler
 * @template Context
 * @param {Request} req - The incoming request
 * @param {Error} error - The caught error
 * @param {Context} ctx - The request context
 * @returns {Response|void|Promise<Response|void>} A Response, or void to continue
 */
export interface RequestErrorHandler<Context = any> {
  (
    req: Request,
    error: Error,
    ctx: Context,
  ): Response | void | Promise<Response | void>;
}

/**
 * Creates a request handler that processes requests through a series of middleware/handlers.
 * Handlers are executed in order. If a handler returns a Response, that response is returned immediately.
 * If no handler returns a Response, returns a 204 No Content response.
 * @template Context
 * @template {Array<RequestHandler<Context>>} Handlers
 * @param {Context} ctxInit - Initial context object
 * @param {...RequestHandler<Context>} handlers - Handler functions to process the request
 * @returns {Function} A function that takes a Request and returns a Promise<Response>
 * @example
 * const handler = respondWith(
 *   {},
 *   parseCookie(),
 *   parseBody(),
 *   (req, ctx) => {
 *     return json({ cookie: ctx.cookie, body: ctx.body });
 *   }
 * );
 */
export const respondWith = <
  Context = any,
  Handlers extends Array<RequestHandler<Context>> = Array<
    RequestHandler<Context>
  >,
>(
  ctxInit: Context,
  ...handlers: [...Handlers]
): { (req: Request): Promise<Response> } => {
  return async (req: Request) => {
    const ctx = ctxInit;
    for (const handler of handlers) {
      let response = handler(req, ctx);
      if (response instanceof Promise) response = await response;
      if (response instanceof Response) return response;
    }
    return status(204, null);
  };
};

/**
 * Creates a request handler with error catching.
 * Similar to respondWith but includes an error handler to catch exceptions.
 * @template Context
 * @template {RequestErrorHandler<Context>} Handler
 * @template {Array<RequestHandler<Context>>} Handlers
 * @param {Context} ctxInit - Initial context object
 * @param {Handler} catcher - Error handler function
 * @param {...RequestHandler<Context>} handlers - Handler functions to process the request
 * @returns {Function} A function that takes a Request and returns a Promise<Response>
 * @example
 * const handler = respondWithCatcher(
 *   {},
 *   (req, error, ctx) => {
 *     return json({ error: error.message }, { status: 500 });
 *   },
 *   parseBody(),
 *   (req, ctx) => {
 *     // This might throw an error
 *     return json({ data: ctx.body });
 *   }
 * );
 */
export const respondWithCatcher = <
  Context = any,
  Handler extends RequestErrorHandler<Context> = RequestErrorHandler<Context>,
  Handlers extends Array<RequestHandler<Context>> = Array<
    RequestHandler<Context>
  >,
>(
  ctxInit: Context,
  catcher: Handler,
  ...handlers: [...Handlers]
): { (req: Request): Promise<Response> } => {
  return async (req: Request) => {
    const ctx = ctxInit;
    try {
      for (const handler of handlers) {
        let response = handler(req, ctx);
        if (response instanceof Promise) response = await response;
        if (response instanceof Response) return response;
      }
    } catch (error) {
      let response = catcher(
        req,
        error instanceof Error ? error : new Error(String(error)),
        ctx,
      );
      if (response instanceof Promise) response = await response;
      if (response instanceof Response) return response;
    }
    return status(204, null);
  };
};
