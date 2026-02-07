# Test Report

| 🕙 Start time | ⌛ Duration |
| --- | ---: |
| 2/7/2026, 11:02:11 PM | 0.524 s |

| | ✅ Passed | ❌ Failed | ⏩ Skipped | 🚧 Todo | ⚪ Total |
| --- | ---: | ---: | ---: | ---: | ---: |
|Test Suites|45|0|0|0|45|
|Tests|155|0|0|0|155|

## ✅ <a id="file0" href="#file0">tests\helpers.test.js</a>

71 passed, 0 failed, 0 skipped, 0 todo, done in 43.80320000000006 s

```
✅ Response Helpers › status()
   ✅ should create response with status code only
   ✅ should create response with custom content
   ✅ should create response with custom headers
   ✅ should override default content-type
   ✅ should handle unknown status codes
✅ Response Helpers › text()
   ✅ should create plain text response
   ✅ should accept custom status
   ✅ should override content-type
✅ Response Helpers › html()
   ✅ should create HTML response
   ✅ should set custom status
✅ Response Helpers › json()
   ✅ should create JSON response
   ✅ should handle nested objects
   ✅ should handle arrays
   ✅ should set custom headers
✅ Response Helpers › blob()
   ✅ should create blob response with inferred type
   ✅ should use octet-stream as fallback
   ✅ should override content-type
✅ Response Helpers › octetStream()
   ✅ should always set octet-stream content type
   ✅ should preserve blob type internally
✅ Response Helpers › formData()
   ✅ should create form data response
   ✅ should handle undefined form data
✅ Response Helpers › usp()
   ✅ should create URLSearchParams response
   ✅ should handle undefined params
✅ Response Helpers › send()
   ✅ should send string as text/plain
   ✅ should send object as JSON
   ✅ should send FormData without content-type override
   ✅ should send URLSearchParams as x-www-form-urlencoded
   ✅ should send Blob as octet-stream
   ✅ should send ReadableStream as octet-stream
   ✅ should send undefined body
   ✅ should handle ArrayBuffer
   ✅ should honor custom content-type for strings
✅ Response Helpers
✅ Cookie Helpers › setCookie()
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
✅ Cookie Helpers › clearCookie()
   ✅ should create cookie clear tuple
   ✅ should include path option when clearing
   ✅ should set maxAge to 0 when provided
✅ Cookie Helpers › parseCookieFromRequest()
   ✅ should parse simple cookie
   ✅ should decode URI components
   ✅ should handle malformed cookie
   ✅ should handle no cookie header
   ✅ should handle empty cookie string
   ✅ should handle extra whitespace
✅ Cookie Helpers › parseCookie()
   ✅ should add cookie to ctx object
   ✅ should work with existing ctx
✅ Cookie Helpers
✅ Body Parsing Helpers › parseBody()
   ✅ should parse JSON body
   ✅ should handle non-object JSON
   ✅ should handle invalid JSON
   ✅ should handle GET request (no body)
✅ Body Parsing Helpers
✅ Response Composition › respondWith()
   ✅ should execute handlers in order
   ✅ should stop when handler returns response
   ✅ should handle async handlers
   ✅ should return default 200 OK if no handler returns response
   ✅ should merge ctx from multiple handlers
   ✅ should work with parseCookie and parseBody
   ✅ should handle typed ctx
✅ Response Composition
✅ Edge Cases
   ✅ status() with empty string content
   ✅ text() with special characters
   ✅ json() with circular reference should throw
   ✅ send() with null
   ✅ cookie parsing with encoded equals sign
   ✅ multiple set-cookie headers
   ✅ respondWith with error in handler
```

## ✅ <a id="file1" href="#file1">tests\router.test.js</a>

84 passed, 0 failed, 0 skipped, 0 todo, done in 104.77740000000006 s

```
✅ Router › Core Router Functionality › Constructor and Configuration
   ✅ should create router with default configuration
   ✅ should create router with custom configuration
✅ Router › Core Router Functionality › Basic Route Registration
   ✅ should register all HTTP methods
   ✅ should handle single handler function
   ✅ should handle array of handlers (pipeline)
   ✅ should return 204 when handler returns void
   ✅ should return 204 when handler returns true
   ✅ should return handler response when it returns false
✅ Router › Core Router Functionality › Path Parameters
   ✅ should extract single path parameter
   ✅ should extract multiple path parameters
   ✅ should handle consecutive parameters
   ✅ should match parameters in middle of path
   ✅ should handle empty path segments
✅ Router › Core Router Functionality › Wildcard Patterns
   ✅ should match single segment wildcard (*)
   ✅ should match multi-segment wildcard (**)
   ✅ should match multi-segment wildcard (.**)
   ✅ should throw error if ** is not at end
   ✅ should handle mixed patterns
✅ Router › Core Router Functionality › Route Priority and Specificity
   ✅ should prioritize exact matches over parameters
   ✅ should handle nested specificity
✅ Router › Core Router Functionality
✅ Router › Handler Types and Execution Order › Hooks
   ✅ should execute hooks before filters and handlers
   ✅ hook can not short-circuit with response
   ✅ hook can not short-circuit with boolean
   ✅ hook can access and modify context
   ✅ multiple hooks execute in order and can short-circuit
✅ Router › Handler Types and Execution Order › Filters
   ✅ filter can block request
   ✅ filter can pass through
   ✅ multiple filters execute in order
   ✅ filters inherit params from matching route
✅ Router › Handler Types and Execution Order › Fallbacks
   ✅ fallback executes when no handler matches
   ✅ fallback does not execute when handler exists
   ✅ multiple fallbacks execute most specific first
   ✅ default fallback executes when no custom fallback matches
✅ Router › Handler Types and Execution Order › Catchers
   ✅ catcher executes on handler error
   ✅ catcher executes on async handler error
   ✅ catcher executes on filter error
   ✅ catcher executes on hook error
   ✅ catcher can access error details
   ✅ default catcher executes when no custom catcher matches
✅ Router › Handler Types and Execution Order › Afters
   ✅ after executes after successful response
   ✅ after executes even when handler returns 204
   ✅ after executes on error path if catcher provides response
✅ Router › Handler Types and Execution Order › Complete Execution Flow
   ✅ full handler chain executes in correct order
   ✅ execution stops when response is returned
✅ Router › Handler Types and Execution Order
✅ Router › Context Management
   ✅ should initialize with default context
   ✅ should merge provided context
   ✅ should preserve context modifications across handlers
   ✅ should handle headers in context
   ✅ should add default headers to response
   ✅ should merge response headers with context headers
   ✅ should handle address in context
✅ Router
   ✅ should handle empty path
   ✅ should handle trailing slash routes
   ✅ should handle query parameters (ignored in routing)
   ✅ should handle encoded paths
   ✅ should handle special characters in paths
   ✅ should handle very long paths
   ✅ should handle concurrent requests
   ✅ should handle large number of routes
   ✅ should handle body parsing in handlers
   ✅ should handle FormData in requests
✅ Route Override Protection
   ✅ should throw error when overriding route without overwrite option
   ✅ should allow override with overwrite option
   ✅ should allow different methods on same path
   ✅ should detect partial route collisions
   ✅ should detect wildcard collisions
✅ Router Composition (append)
   ✅ should append router with prefix
   ✅ should handle nested router prefixes
   ✅ should preserve handler types when appending
   ✅ should handle wildcard routes in appended routers
   ✅ should merge options when appending
✅ Method Chaining
   ✅ should support method chaining for all handler types
   ✅ should support chaining with append
✅ Helper Functions Integration
   ✅ should work with status helper
   ✅ should work with text helper
   ✅ should work with html helper
   ✅ should work with json helper
✅ Middleware Integration
   ✅ should work with CORS middleware
   ✅ should work with rate limiting middleware
   ✅ should work with basic auth middleware
✅ Performance Tests
   ✅ should handle 10,000 routes efficiently
   ✅ should handle deep nesting efficiently
✅ Utility Functions › isValidHttpMethod
   ✅ should return true for valid HTTP methods
   ✅ should return false for invalid HTTP methods
✅ Utility Functions
```
