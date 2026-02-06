import { RouterContext } from "./router";
import { Handler } from "./types";
export * from "./upload-stream";
export interface SocketAddress {
    address: string;
    family: string;
    port: number;
}
export type CTXError = {
    error: Error;
};
export type CTXAddress = {
    address: SocketAddress;
};
export declare function getHttpStatusText(code: number): string;
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
export declare const status: (status: number, content?: string | null, init?: ResponseInit) => Response;
/**
 * Creates a redirect Response.
 * Defaults to 302 Found unless another status is provided.
 * @param {string} location - The URL to redirect to
 * @param {number} [code=302] - The HTTP status code (301, 302, 303, 307, 308)
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
export declare const redirect: (location: string, init?: ResponseInit) => Response;
/**
 * Forwards the request to another handler internally.
 * Does not change the URL or send a redirect to the client.
 * @param {string} path - The new path to forward to
 * @returns {Response} A Response object with the forwarded request's response
 */
export declare const forward: <XContext = {}>(path: string) => Handler<RouterContext<XContext>>;
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
export declare const text: (content: string, init?: ResponseInit) => Response;
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
export declare const html: (content: string, init?: ResponseInit) => Response;
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
export declare const json: (body: any, init?: ResponseInit) => Response;
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
export declare const blob: (blob: Blob, init?: ResponseInit) => Response;
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
export declare const octetStream: (octet: Blob | ArrayBuffer | ReadableStream, init?: ResponseInit) => Response;
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
export declare const formData: (formData?: FormData, init?: ResponseInit) => Response;
/**
 * Creates a Response from URLSearchParams with application/x-www-form-urlencoded content-type.
 * @param {URLSearchParams} [usp] - The URL search parameters to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with application/x-www-form-urlencoded content-type
 * @example
 * const params = new URLSearchParams({ q: "search term" });
 * usp(params);
 */
export declare const usp: (usp?: URLSearchParams, init?: ResponseInit) => Response;
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
export declare const send: (body?: BodyInit, init?: ResponseInit) => Response;
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
export declare const setCookie: (name: string, value: string, options?: CookieOptions) => CookieTuple;
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
export declare const clearCookie: (name: string, options?: CookieOptions) => CookieTuple;
/**
 * Parses cookies from a Request object's Cookie header.
 * @template {Record<string, string>} Expected
 * @param {Request} req - The request object containing cookies
 * @returns {Expected|undefined} An object with cookie name-value pairs, or undefined if no cookies
 * @example
 * const cookies = parseCookieFromRequest(req);
 * // Returns: { session: "abc123", theme: "dark" }
 */
export declare const parseCookieFromRequest: <Expected extends Record<string, string>>(req: Request) => Expected | undefined;
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
export declare const parseCookie: <Context extends CTXCookie>() => Handler<Context>;
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
export type SupportedBodyMediaTypes = "application/x-www-form-urlencoded" | "application/json" | "text/plain";
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
export declare const parseBody: <Context extends CTXBody>(options?: {
    accept?: SupportedBodyMediaTypes | SupportedBodyMediaTypes[];
    maxSize?: number;
}) => Handler<Context>;
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
    (req: Request, error: Error, ctx: Context): Response | void | Promise<Response | void>;
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
export declare const respondWith: <Context = any, Handlers extends Array<RequestHandler<Context>> = Array<RequestHandler<Context>>>(ctxInit: Context, ...handlers: [...Handlers]) => {
    (req: Request): Promise<Response>;
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
export declare const respondWithCatcher: <Context = any, Handler extends RequestErrorHandler<Context> = RequestErrorHandler<Context>, Handlers extends Array<RequestHandler<Context>> = Array<RequestHandler<Context>>>(ctxInit: Context, catcher: Handler, ...handlers: [...Handlers]) => {
    (req: Request): Promise<Response>;
};
//# sourceMappingURL=helpers.d.ts.map