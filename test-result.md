# Test Report

| 🕙 Start time | ⌛ Duration |
| --- | ---: |
| 4/4/2026, 12:08:32 PM | 0.816 s |

| | ✅ Passed | ❌ Failed | ⏩ Skipped | 🚧 Todo | ⚪ Total |
| --- | ---: | ---: | ---: | ---: | ---: |
|Test Suites|29|0|0|0|29|
|Tests|138|0|0|0|138|

## ✅ <a id="file0" href="#file0">tests/helpers.test.js</a>

58 passed, 0 failed, 0 skipped, 0 todo, done in 67.49869400000011 s

```
✅ Response Helpers › status / redirect
   ✅ status sets code and default text-type header when body present
   ✅ status with null body does not set content-type
   ✅ redirect sets Location and statusText
✅ Response Helpers › primitive response creators (text, html, json)
   ✅ text returns text/plain and preserves content
   ✅ html returns text/html
   ✅ json sets application/json; charset=utf-8 and serializes body
✅ Response Helpers › binary and streaming responses
   ✅ blob sets inferred content-type and content-length
   ✅ octetStream forces application/octet-stream and length for buffers
✅ Response Helpers › form and url responses
   ✅ formData can return a FormData body
   ✅ usp returns application/x-www-form-urlencoded and text body
✅ Response Helpers › send() convenience
   ✅ send string defaults to text/plain; charset=utf-8
   ✅ send object returns JSON response
   ✅ send respects explicit custom content-type header
✅ Response Helpers › Cookie Helpers › setCookie()
   ✅ should create basic cookie tuple
   ✅ should include path option
   ✅ should include domain option
   ✅ should include expires option with Date
   ✅ should include expires option with string
   ✅ should include maxAge option
   ✅ should include httpOnly option
   ✅ should include secure option
   ✅ should include sameSite option
   ✅ should include all options
✅ Response Helpers › Cookie Helpers › clearCookie()
   ✅ should create cookie clear tuple
   ✅ should include path option when clearing
   ✅ should set maxAge to 0 when provided
✅ Response Helpers › Cookie Helpers › parseCookieFromRequest()
   ✅ should parse simple cookie
   ✅ should decode URI components
   ✅ should handle malformed cookie
   ✅ should handle no cookie header
   ✅ should handle empty cookie string
   ✅ should handle extra whitespace
✅ Response Helpers › Cookie Helpers › parseCookie()
   ✅ should add cookie to ctx object
   ✅ should work with existing ctx
✅ Response Helpers › Cookie Helpers
✅ Response Helpers › Body Parsing Helpers › parseBody()
   ✅ should parse JSON body
   ✅ should handle non-object JSON
   ✅ should handle invalid JSON
   ✅ should handle GET request (no body)
✅ Response Helpers › Body Parsing Helpers
✅ Response Helpers › Response Composition › respondWith()
   ✅ should execute handlers in order
   ✅ should stop when handler returns response
   ✅ should handle async handlers
   ✅ should return default 200 OK if no handler returns response
   ✅ should merge ctx from multiple handlers
   ✅ should work with parseCookie and parseBody
   ✅ should handle typed ctx
✅ Response Helpers › Response Composition
✅ Response Helpers › Edge Cases › additional helpers
   ✅ redirect should set Location header and default 302 status
   ✅ status() with null content should not set content-type
   ✅ respondWithCatcher should return catcher's response when handler throws
   ✅ send preserves custom content-type for objects when provided
   ✅ octetStream with ArrayBuffer sets content-length header
   ✅ clearCookie with explicit expires uses provided date
✅ Response Helpers › Edge Cases
   ✅ status() with empty string content
   ✅ text() with special characters
   ✅ json() with circular reference should throw
   ✅ send() with null
   ✅ cookie parsing with encoded equals sign
   ✅ multiple set-cookie headers
   ✅ respondWith with error in handler
✅ Response Helpers
```

## ✅ <a id="file1" href="#file1">tests/middlewares.test.js</a>

20 passed, 0 failed, 0 skipped, 0 todo, done in 37.34939499999996 s

```
✅ Middlewares
   ✅ parseQuery should populate ctx.query from URLSearchParams
   ✅ parseBody should parse JSON arrays into { values }
   ✅ parseBody should parse text/plain into { text }
   ✅ cors should set CORS headers and respond to OPTIONS with 204
   ✅ authenticate should return 401 when parseAuth returns null
   ✅ authenticate should set ctx.auth when parseAuth returns Auth
   ✅ authorize should return 401 when no auth present
   ✅ authorize should forbid when role not allowed
   ✅ parseAuthBasic should authenticate raw credentials and set ctx property
   ✅ parseAuthAPIKey should set ctx when key verified
   ✅ parseAuthJWT should verify token and populate ctx
   ✅ parseBody should return 415 for unsupported content-type
   ✅ parseBody should return 400 on malformed payload
   ✅ limitRate should throw when neither refillInterval nor refillRate provided
   ✅ limitRate with refillInterval should decrement tokens and return 429 when exhausted
   ✅ cors throws when credentials true with wildcard origin
   ✅ parseAuthBasic should return 401 for invalid credentials and set WWW-Authenticate header
   ✅ parseAuthAPIKey should return 401 when header missing or invalid
   ✅ parseAuthJWT should return 401 when Authorization header missing
   ✅ authenticate checkOnly should return false instead of response
```

## ✅ <a id="file2" href="#file2">tests/route.override.test.js</a>

15 passed, 0 failed, 0 skipped, 0 todo, done in 30.16455699999983 s

```
✅ Route Override Tests
   ✅ handler overwrite true replaces existing handler implementation
   ✅ attempting to register same route without overwrite throws
   ✅ overwrite works for filters too (new filter runs)
   ✅ overwrite honors normalized trailing slash when router configured
   ✅ overwrite replaces array pipeline with single handler
   ✅ overwrite only affects specified method when ALL macro present
   ✅ overwrite only affects specified CRUD methods when CRUD macro present
   ✅ overwrite replaces filter pipeline when provided as array
   ✅ overwrite replaces after handler behavior
   ✅ overwrite replaces fallback used when no handler matches
   ✅ normalized trailing slash: /a and /a/ map to same route when enabled
   ✅ parameter route will throw due to override with single-segment wildcard in the same position
   ✅ multi-segment wildcard does not override explicit parameter route
   ✅ literal segment takes precedence over parameter in same position
   ✅ single-segment route will throw due to override on wildcard in same position
```

## ✅ <a id="file3" href="#file3">tests/router.test.js</a>

45 passed, 0 failed, 0 skipped, 0 todo, done in 62.09582799999998 s

```
✅ Router › Basics
   ✅ registers and responds with a handler
   ✅ extracts path parameters
   ✅ registers handlers for all HTTP methods
   ✅ registers handlers for all HTTP methods using ALL
   ✅ registers handlers for crud HTTP methods using CRUD
   ✅ * wildcard matches one segment
   ✅ .* wildcard matches current path and one segment
   ✅ ** wildcard matches many segments
   ✅ .** wildcard matches current path and many segments
   ✅ setRoutes throws when glob with current node '.*' used in middle of path
   ✅ setRoutes throws when super-glob '**' used in middle of path
   ✅ setRoutes throws when super-glob with current node '.**' used in middle of path
   ✅ exact route takes precedence over parameter route
   ✅ default trailing slash routes: /api and /api/ behavior
   ✅ normalized trailing slash routes: /api and /api/ behavior
   ✅ registering same route twice without overwrite throws
✅ Router › Pipelines Hooks, Afters, Filters, Handlers, Fallbacks & Catchers
   ✅ handler type execution order is maintained
   ✅ filters can short-circuit and return a response
   ✅ handlers can short-circuit and return a response
   ✅ filters pipeline executes all globs starting from leaf
   ✅ filters can end only pipeline on truthy return
   ✅ catchers handle errors thrown in hooks
   ✅ catchers handle errors thrown in afters
   ✅ catchers handle errors thrown in filters
   ✅ catchers handle errors thrown in handlers
   ✅ catchers handle errors thrown in fallbacks
   ✅ default catchers handle errors thrown in cathcers
✅ Router › Forward, Append & Composition
   ✅ forward passes headers and path to target
   ✅ forward with method override sets X-Forwarded-Method on new request
   ✅ append mounts another router under prefix and discards config
✅ Router › Auth & Parsing Integrations
   ✅ basic auth filter blocks and allows correctly
   ✅ authAPIKey allows valid key and blocks invalid
   ✅ authJWT populates ctx when token valid
✅ Router › Advanced & Misc
   ✅ handler pipeline: later handler sees ctx changes
   ✅ returns 204 when handler returns void/true/false treated as no content
   ✅ after handlers run after response and can add headers to response in context
   ✅ limitRate middleware integrated with router (refillInterval)
   ✅ defaultHeaders (function) are added to responses
   ✅ parseBody integration: POST with JSON parsed into ctx.body
   ✅ parseCookie integration: middleware adds cookie to ctx
   ✅ limitRate with refillRate refills tokens over time
   ✅ hooks that return a Response are ignored and handler still runs
   ✅ invalid HTTP method returns 405 Method Not Allowed
   ✅ router defaultFallback used when provided in constructor
   ✅ router defaultCatcher handles uncaught errors when no custom catcher
✅ Router
```
