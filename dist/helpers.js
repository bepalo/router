"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.respondWithCatcher = exports.respondWith = exports.parseCookieFromRequest = exports.clearCookie = exports.setCookie = exports.send = exports.usp = exports.formData = exports.octetStream = exports.blob = exports.json = exports.html = exports.text = exports.forward = exports.redirect = exports.status = exports.Status = void 0;
exports.getHttpStatusText = getHttpStatusText;
__exportStar(require("./upload-stream"), exports);
var Status;
(function (Status) {
    Status[Status["_100_Continue"] = 100] = "_100_Continue";
    Status[Status["_101_SwitchingProtocols"] = 101] = "_101_SwitchingProtocols";
    Status[Status["_102_Processing"] = 102] = "_102_Processing";
    Status[Status["_103_EarlyHints"] = 103] = "_103_EarlyHints";
    Status[Status["_200_OK"] = 200] = "_200_OK";
    Status[Status["_201_Created"] = 201] = "_201_Created";
    Status[Status["_202_Accepted"] = 202] = "_202_Accepted";
    Status[Status["_203_NonAuthoritativeInformation"] = 203] = "_203_NonAuthoritativeInformation";
    Status[Status["_204_NoContent"] = 204] = "_204_NoContent";
    Status[Status["_205_ResetContent"] = 205] = "_205_ResetContent";
    Status[Status["_206_PartialContent"] = 206] = "_206_PartialContent";
    Status[Status["_207_MultiStatus"] = 207] = "_207_MultiStatus";
    Status[Status["_208_AlreadyReported"] = 208] = "_208_AlreadyReported";
    Status[Status["_226_IMUsed"] = 226] = "_226_IMUsed";
    Status[Status["_300_MultipleChoices"] = 300] = "_300_MultipleChoices";
    Status[Status["_301_MovedPermanently"] = 301] = "_301_MovedPermanently";
    Status[Status["_302_Found"] = 302] = "_302_Found";
    Status[Status["_303_SeeOther"] = 303] = "_303_SeeOther";
    Status[Status["_304_NotModified"] = 304] = "_304_NotModified";
    Status[Status["_305_UseProxy"] = 305] = "_305_UseProxy";
    Status[Status["_307_TemporaryRedirect"] = 307] = "_307_TemporaryRedirect";
    Status[Status["_308_PermanentRedirect"] = 308] = "_308_PermanentRedirect";
    Status[Status["_400_BadRequest"] = 400] = "_400_BadRequest";
    Status[Status["_401_Unauthorized"] = 401] = "_401_Unauthorized";
    Status[Status["_402_PaymentRequired"] = 402] = "_402_PaymentRequired";
    Status[Status["_403_Forbidden"] = 403] = "_403_Forbidden";
    Status[Status["_404_NotFound"] = 404] = "_404_NotFound";
    Status[Status["_405_MethodNotAllowed"] = 405] = "_405_MethodNotAllowed";
    Status[Status["_406_NotAcceptable"] = 406] = "_406_NotAcceptable";
    Status[Status["_407_ProxyAuthenticationRequired"] = 407] = "_407_ProxyAuthenticationRequired";
    Status[Status["_408_RequestTimeout"] = 408] = "_408_RequestTimeout";
    Status[Status["_409_Conflict"] = 409] = "_409_Conflict";
    Status[Status["_410_Gone"] = 410] = "_410_Gone";
    Status[Status["_411_LengthRequired"] = 411] = "_411_LengthRequired";
    Status[Status["_412_PreconditionFailed"] = 412] = "_412_PreconditionFailed";
    Status[Status["_413_PayloadTooLarge"] = 413] = "_413_PayloadTooLarge";
    Status[Status["_414_URITooLong"] = 414] = "_414_URITooLong";
    Status[Status["_415_UnsupportedMediaType"] = 415] = "_415_UnsupportedMediaType";
    Status[Status["_416_RangeNotSatisfiable"] = 416] = "_416_RangeNotSatisfiable";
    Status[Status["_417_ExpectationFailed"] = 417] = "_417_ExpectationFailed";
    Status[Status["_418_IMATeapot"] = 418] = "_418_IMATeapot";
    Status[Status["_421_MisdirectedRequest"] = 421] = "_421_MisdirectedRequest";
    Status[Status["_422_UnprocessableEntity"] = 422] = "_422_UnprocessableEntity";
    Status[Status["_423_Locked"] = 423] = "_423_Locked";
    Status[Status["_424_FailedDependency"] = 424] = "_424_FailedDependency";
    Status[Status["_425_TooEarly"] = 425] = "_425_TooEarly";
    Status[Status["_426_UpgradeRequired"] = 426] = "_426_UpgradeRequired";
    Status[Status["_428_PreconditionRequired"] = 428] = "_428_PreconditionRequired";
    Status[Status["_429_TooManyRequests"] = 429] = "_429_TooManyRequests";
    Status[Status["_431_RequestHeaderFieldsTooLarge"] = 431] = "_431_RequestHeaderFieldsTooLarge";
    Status[Status["_451_UnavailableForLegalReasons"] = 451] = "_451_UnavailableForLegalReasons";
    Status[Status["_500_InternalServerError"] = 500] = "_500_InternalServerError";
    Status[Status["_501_NotImplemented"] = 501] = "_501_NotImplemented";
    Status[Status["_502_BadGateway"] = 502] = "_502_BadGateway";
    Status[Status["_503_ServiceUnavailable"] = 503] = "_503_ServiceUnavailable";
    Status[Status["_504_GatewayTimeout"] = 504] = "_504_GatewayTimeout";
    Status[Status["_505_HTTPVersionNotSupported"] = 505] = "_505_HTTPVersionNotSupported";
    Status[Status["_506_VariantAlsoNegotiates"] = 506] = "_506_VariantAlsoNegotiates";
    Status[Status["_507_InsufficientStorage"] = 507] = "_507_InsufficientStorage";
    Status[Status["_508_LoopDetected"] = 508] = "_508_LoopDetected";
    Status[Status["_510_NotExtended"] = 510] = "_510_NotExtended";
    Status[Status["_511_NetworkAuthenticationRequired"] = 511] = "_511_NetworkAuthenticationRequired";
    Status[Status["_419_PageExpired"] = 419] = "_419_PageExpired";
    Status[Status["_420_EnhanceYourCalm"] = 420] = "_420_EnhanceYourCalm";
    Status[Status["_450_BlockedbyWindowsParentalControls"] = 450] = "_450_BlockedbyWindowsParentalControls";
    Status[Status["_498_InvalidToken"] = 498] = "_498_InvalidToken";
    Status[Status["_499_TokenRequired"] = 499] = "_499_TokenRequired";
    Status[Status["_509_BandwidthLimitExceeded"] = 509] = "_509_BandwidthLimitExceeded";
    Status[Status["_526_InvalidSSLCertificate"] = 526] = "_526_InvalidSSLCertificate";
    Status[Status["_529_Siteisoverloaded"] = 529] = "_529_Siteisoverloaded";
    Status[Status["_530_Siteisfrozen"] = 530] = "_530_Siteisfrozen";
    Status[Status["_598_NetworkReadTimeoutError"] = 598] = "_598_NetworkReadTimeoutError";
    Status[Status["_599_NetworkConnectTimeoutError"] = 599] = "_599_NetworkConnectTimeoutError";
})(Status || (exports.Status = Status = {}));
function getHttpStatusText(code) {
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
            if (code >= 100 && code < 200)
                return "Informational Response";
            if (code >= 200 && code < 300)
                return "Successful Response";
            if (code >= 300 && code < 400)
                return "Redirection Message";
            if (code >= 400 && code < 500)
                return "Client Error Response";
            if (code >= 500 && code < 600)
                return "Server Error Response";
            return "Unknown Status Code";
    }
}
/**
 * Creates a Response with the specified status code.
 * Defaults to 'text/plain; charset=utf-8' content-type if not provided in init.headers.
 * @param {number} status - The HTTP status code
 * @param {string|null} [content] - The response body content
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object
 * @example
 * status(200, "Success");
 * status(404, "Not Found");
 * status(204, null); // No content response
 */
const status = (status, content, init) => {
    var _a;
    const statusText = (_a = init === null || init === void 0 ? void 0 : init.statusText) !== null && _a !== void 0 ? _a : getHttpStatusText(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (content !== null && !headers.has("content-type")) {
        headers.set("content-type", "text/plain; charset=utf-8");
    }
    return new Response(content !== undefined ? content : statusText, Object.assign(Object.assign({ statusText }, init), { status,
        headers }));
};
exports.status = status;
/**
 * Creates a redirect Response.
 * Defaults to 302 Found unless another status is provided.
 * @param {string} location - The URL to redirect to
 * @param {number} [code=302] - The HTTP status code (301, 302, 303, 307, 308)
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
const redirect = (location, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 302;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : getHttpStatusText(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    headers.set("Location", location);
    return new Response(null, Object.assign(Object.assign({ statusText }, init), { status,
        headers }));
};
exports.redirect = redirect;
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
const forward = (path, options) => {
    return function (req, ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const method = (_a = options === null || options === void 0 ? void 0 : options.method) !== null && _a !== void 0 ? _a : req.method;
            const headers = new Headers(req.headers);
            const body = req.body ? yield req.clone().arrayBuffer() : undefined;
            const url = new URL(req.url);
            const originalPathname = url.pathname;
            url.pathname = path;
            if (method != req.method)
                headers.set("X-Forwarded-Method", req.method);
            headers.set("X-Forwarded-Path", originalPathname);
            if (!req.headers.has("X-Original-Path")) {
                headers.set("X-Original-Path", originalPathname);
            }
            const newReq = new Request(url.toString(), { method, headers, body });
            return this.respond(newReq, ctx);
        });
    };
};
exports.forward = forward;
/**
 * Creates a text/plain Response.
 * Defaults to status 200 and 'text/plain; charset=utf-8' content-type if not specified.
 * @param {string} content - The text content to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with text/plain content-type
 * @example
 * text("Hello, world!");
 * text("Error occurred", { status: 500 });
 */
const text = (content, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : getHttpStatusText(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (!headers.has("content-type")) {
        headers.set("content-type", "text/plain; charset=utf-8");
    }
    return new Response(content, Object.assign(Object.assign({ statusText }, init), { status,
        headers }));
};
exports.text = text;
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
const html = (content, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : getHttpStatusText(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (!headers.has("content-type")) {
        headers.set("content-type", "text/html; charset=utf-8");
    }
    return new Response(content, Object.assign(Object.assign({ statusText }, init), { status,
        headers }));
};
exports.html = html;
/**
 * Creates a JSON Response.
 * Defaults to status 200 and 'application/json; charset=utf-8' content-type if not specified.
 * Uses Response.json() internally which automatically serializes the body.
 * @param {any} body - The data to serialize as JSON
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with application/json content-type
 * @example
 * json({ message: "Success" });
 * json({ error: "Not found" }, { status: 404 });
 */
const json = (body, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : getHttpStatusText(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (!headers.has("content-type")) {
        headers.set("content-type", "application/json; charset=utf-8");
    }
    return Response.json(body, Object.assign(Object.assign({ statusText }, init), { status,
        headers }));
};
exports.json = json;
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
const blob = (blob, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : getHttpStatusText(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (!headers.has("content-type")) {
        headers.set("content-type", blob.type || "application/octet-stream");
    }
    headers.set("content-length", blob.size.toFixed());
    return new Response(blob, Object.assign(Object.assign({ statusText }, init), { status,
        headers }));
};
exports.blob = blob;
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
const octetStream = (octet, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : getHttpStatusText(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (!headers.has("content-type")) {
        headers.set("content-type", "application/octet-stream");
    }
    if (!(octet instanceof ReadableStream)) {
        headers.set("content-length", (octet instanceof Blob ? octet.size : octet.byteLength).toFixed());
    }
    return new Response(octet, Object.assign(Object.assign({ statusText }, init), { status,
        headers }));
};
exports.octetStream = octetStream;
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
const formData = (formData, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : getHttpStatusText(status);
    return new Response(formData, Object.assign(Object.assign({ statusText }, init), { status }));
};
exports.formData = formData;
/**
 * Creates a Response from URLSearchParams with application/x-www-form-urlencoded content-type.
 * @param {URLSearchParams} [usp] - The URL search parameters to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with application/x-www-form-urlencoded content-type
 * @example
 * const params = new URLSearchParams({ q: "search term" });
 * usp(params);
 */
const usp = (usp, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : getHttpStatusText(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (!headers.has("content-type")) {
        headers.set("content-type", "application/x-www-form-urlencoded");
    }
    return new Response(usp, Object.assign(Object.assign({ statusText }, init), { status,
        headers }));
};
exports.usp = usp;
/**
 * Creates a Response from various body types with automatic content-type detection.
 * Supports strings, objects (JSON), Blobs, ArrayBuffers, FormData, URLSearchParams, and ReadableStreams.
 * @param {BodyInit|Record<string, unknown>} [body] - The body content to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with appropriate content-type
 * @example
 * send("text"); // text/plain
 * send({ message: "success" }); // application/json; charset=utf-8
 * send(new Blob([])); // blob.type || application/octet-stream
 * send(new FormData()); // multipart/form-data
 * send(new URLSearchParams()); // application/x-www-form-urlencoded
 */
const send = (body, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : getHttpStatusText(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    const isContentTypeNotSet = !headers.has("content-type");
    if (body instanceof URLSearchParams) {
        if (isContentTypeNotSet) {
            headers.set("content-type", "application/x-www-form-urlencoded");
        }
    }
    else if (body instanceof FormData) {
        // content type will be generated
    }
    else if (typeof body === "string") {
        if (isContentTypeNotSet) {
            headers.set("content-type", "text/plain; charset=utf-8");
        }
    }
    else if (body instanceof Blob) {
        if (isContentTypeNotSet) {
            headers.set("content-type", body.type || "application/octet-stream");
        }
    }
    else if (body instanceof ArrayBuffer ||
        ArrayBuffer.isView(body) ||
        body instanceof ReadableStream) {
        if (isContentTypeNotSet) {
            headers.set("content-type", "application/octet-stream");
        }
    }
    else if (body != null) {
        if (isContentTypeNotSet) {
            headers.set("content-type", "application/json; charset=utf-8");
        }
        return Response.json(body, Object.assign(Object.assign({ status,
            statusText }, init), { headers }));
    }
    return new Response(body, Object.assign(Object.assign({ statusText }, init), { status,
        headers }));
};
exports.send = send;
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
const setCookie = (name, value, options) => {
    const parts = [`${name}=${value}`];
    if (options) {
        if (options.path)
            parts.push(`Path=${options.path}`);
        if (options.domain)
            parts.push(`Domain=${options.domain}`);
        if (options.expires)
            parts.push(`Expires=${new Date(options.expires).toUTCString()}`);
        if (options.maxAge !== undefined)
            parts.push(`Max-Age=${options.maxAge}`);
        if (options.httpOnly)
            parts.push(`HttpOnly`);
        if (options.secure)
            parts.push(`Secure`);
        if (options.sameSite)
            parts.push(`SameSite=${options.sameSite}`);
    }
    const cookie = parts.join("; ");
    return ["Set-Cookie", cookie];
};
exports.setCookie = setCookie;
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
const clearCookie = (name, options) => {
    const parts = [`${name}=`];
    const expires = (options === null || options === void 0 ? void 0 : options.expires)
        ? new Date(options.expires).toUTCString()
        : "Thu, 01 Jan 1970 00:00:00 GMT";
    if (options) {
        if (options.path)
            parts.push(`Path=${options.path}`);
        if (options.domain)
            parts.push(`Domain=${options.domain}`);
        if (options.maxAge !== undefined)
            parts.push(`Max-Age=${options.maxAge}`);
        if (options.httpOnly)
            parts.push(`HttpOnly`);
        if (options.secure)
            parts.push(`Secure`);
        if (options.sameSite)
            parts.push(`SameSite=${options.sameSite}`);
    }
    if (expires)
        parts.push(`Expires=${expires}`);
    const cookie = parts.join("; ");
    return ["Set-Cookie", cookie];
};
exports.clearCookie = clearCookie;
/**
 * Parses cookies from a Request object's Cookie header.
 * @template {Record<string, string>} Expected
 * @param {Request} req - The request object containing cookies
 * @returns {Expected|undefined} An object with cookie name-value pairs, or undefined if no cookies
 * @example
 * const cookies = parseCookieFromRequest(req);
 * // Returns: { session: "abc123", theme: "dark" }
 */
const parseCookieFromRequest = (req) => {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader != null) {
        const cookies = {};
        for (const pair of cookieHeader.split(";")) {
            const [rawName, rawValue, extra] = pair
                .trim()
                .split("=", 3)
                .map((token) => token.trim());
            if (rawName &&
                rawValue !== undefined &&
                rawValue !== "" &&
                extra === undefined) {
                cookies[rawName] = decodeURIComponent(rawValue);
            }
        }
        return cookies;
    }
    return undefined;
};
exports.parseCookieFromRequest = parseCookieFromRequest;
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
const respondWith = (ctxInit, ...handlers) => {
    return (req) => __awaiter(void 0, void 0, void 0, function* () {
        const ctx = ctxInit;
        for (const handler of handlers) {
            let response = handler(req, ctx);
            if (response instanceof Promise)
                response = yield response;
            if (response instanceof Response)
                return response;
        }
        return (0, exports.status)(204, null);
    });
};
exports.respondWith = respondWith;
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
const respondWithCatcher = (ctxInit, catcher, ...handlers) => {
    return (req) => __awaiter(void 0, void 0, void 0, function* () {
        const ctx = ctxInit;
        try {
            for (const handler of handlers) {
                let response = handler(req, ctx);
                if (response instanceof Promise)
                    response = yield response;
                if (response instanceof Response)
                    return response;
            }
        }
        catch (error) {
            let response = catcher(req, error instanceof Error ? error : new Error(String(error)), ctx);
            if (response instanceof Promise)
                response = yield response;
            if (response instanceof Response)
                return response;
        }
        return (0, exports.status)(204, null);
    });
};
exports.respondWithCatcher = respondWithCatcher;
//# sourceMappingURL=helpers.js.map