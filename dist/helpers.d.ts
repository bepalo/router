import type { BoundHandler, HttpMethod } from "./types";
export * from "./upload-stream";
export declare enum Status {
    _100_Continue = 100,
    _101_SwitchingProtocols = 101,
    _102_Processing = 102,
    _103_EarlyHints = 103,
    _200_OK = 200,
    _201_Created = 201,
    _202_Accepted = 202,
    _203_NonAuthoritativeInformation = 203,
    _204_NoContent = 204,
    _205_ResetContent = 205,
    _206_PartialContent = 206,
    _207_MultiStatus = 207,
    _208_AlreadyReported = 208,
    _226_IMUsed = 226,
    _300_MultipleChoices = 300,
    _301_MovedPermanently = 301,
    _302_Found = 302,
    _303_SeeOther = 303,
    _304_NotModified = 304,
    _305_UseProxy = 305,
    _307_TemporaryRedirect = 307,
    _308_PermanentRedirect = 308,
    _400_BadRequest = 400,
    _401_Unauthorized = 401,
    _402_PaymentRequired = 402,
    _403_Forbidden = 403,
    _404_NotFound = 404,
    _405_MethodNotAllowed = 405,
    _406_NotAcceptable = 406,
    _407_ProxyAuthenticationRequired = 407,
    _408_RequestTimeout = 408,
    _409_Conflict = 409,
    _410_Gone = 410,
    _411_LengthRequired = 411,
    _412_PreconditionFailed = 412,
    _413_PayloadTooLarge = 413,
    _414_URITooLong = 414,
    _415_UnsupportedMediaType = 415,
    _416_RangeNotSatisfiable = 416,
    _417_ExpectationFailed = 417,
    _418_IMATeapot = 418,
    _421_MisdirectedRequest = 421,
    _422_UnprocessableEntity = 422,
    _423_Locked = 423,
    _424_FailedDependency = 424,
    _425_TooEarly = 425,
    _426_UpgradeRequired = 426,
    _428_PreconditionRequired = 428,
    _429_TooManyRequests = 429,
    _431_RequestHeaderFieldsTooLarge = 431,
    _451_UnavailableForLegalReasons = 451,
    _500_InternalServerError = 500,
    _501_NotImplemented = 501,
    _502_BadGateway = 502,
    _503_ServiceUnavailable = 503,
    _504_GatewayTimeout = 504,
    _505_HTTPVersionNotSupported = 505,
    _506_VariantAlsoNegotiates = 506,
    _507_InsufficientStorage = 507,
    _508_LoopDetected = 508,
    _510_NotExtended = 510,
    _511_NetworkAuthenticationRequired = 511,
    _419_PageExpired = 419,
    _420_EnhanceYourCalm = 420,
    _450_BlockedbyWindowsParentalControls = 450,
    _498_InvalidToken = 498,
    _499_TokenRequired = 499,
    _509_BandwidthLimitExceeded = 509,
    _526_InvalidSSLCertificate = 526,
    _529_Siteisoverloaded = 529,
    _530_Siteisfrozen = 530,
    _598_NetworkReadTimeoutError = 598,
    _599_NetworkConnectTimeoutError = 599
}
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
 * Forwards the request to another route internally.
 * Does not send a redirect to the client but changes the path and method,
 * adds X-Forwarded-[Method|Path] and X-Original-Path headers and calls
 * `(this as Router).respond(newReq, ctx)`.
 * NOTE: parse body only once at the first handler using `parseBody({once: true})`
 *   as the body will be consumed at the first parseBody call.
 * @param {string} path - The new path to forward to
 * @returns {Response} A Response object with the forwarded request's response
 */
export declare const forward: <XContext = {}>(path: string, options?: {
    method?: HttpMethod;
}) => BoundHandler<XContext>;
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