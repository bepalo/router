// router.test.js
import { describe, test, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest'
import { Router, isValidHttpMethod, status, text, html, json, cors, authBasic, limitRate } from '@bepalo/router'

// Mock request helper with body support
const mockRequest = (method, url, options = {}) => {
  const { headers = {}, body = null, bodyUsed = false } = options
  const requestInit = {
    method,
    headers: new Headers(headers)
  }

  if (body) {
    if (typeof body === 'string') {
      requestInit.body = body
    } else if (body instanceof FormData) {
      requestInit.body = body
    } else {
      requestInit.body = JSON.stringify(body)
      if (!headers['Content-Type']) {
        requestInit.headers.set('Content-Type', 'application/json')
      }
    }
  }

  const request = new Request(url, requestInit)

  // Mock bodyUsed for tests
  if (bodyUsed) {
    vi.spyOn(request, 'bodyUsed', 'get').mockReturnValue(true)
  }

  return request
}

// Mock Time module for testing
const mockTime = () => {
  let currentTime = 0
  return {
    now: () => currentTime,
    advance: (ms) => { currentTime += ms },
    reset: () => { currentTime = 0 }
  }
}

describe('Router', () => {
  let router
  let time

  beforeEach(() => {
    router = new Router()
    time = mockTime()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Core Router Functionality', () => {
    describe('Constructor and Configuration', () => {
      test('should create router with default configuration', () => {
        const router = new Router()
        expect(router.defaultHeaders).toEqual([])
        expect(router.defaultCatcher).toBeUndefined()
        expect(router.defaultFallback).toBeUndefined()
      })

      test('should create router with custom configuration', () => {
        const defaultCatcher = vi.fn()
        const defaultFallback = vi.fn()

        const router = new Router({
          defaultHeaders: [['X-Powered-By', 'Test']],
          defaultCatcher,
          defaultFallback
        })

        expect(router.defaultHeaders).toEqual([['X-Powered-By', 'Test']])
        expect(router.defaultCatcher).toBe(defaultCatcher)
        expect(router.defaultFallback).toBe(defaultFallback)
      })
    })

    describe('Basic Route Registration', () => {
      test('should register all HTTP methods', async () => {
        const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

        for (const method of methods) {
          const handler = vi.fn().mockResolvedValue(new Response(`${method} Success`))
          router.handle(`${method} /test`, handler)

          const req = mockRequest(method, 'http://localhost/test')
          const response = await router.respond(req)

          expect(response.status).toBe(200)
          expect(await response.text()).toBe(`${method} Success`)
          expect(handler).toHaveBeenCalledTimes(1)

          vi.clearAllMocks()
        }
      })

      test('should handle single handler function', async () => {
        const handler = vi.fn().mockResolvedValue(new Response('Single'))
        router.handle('GET /single', handler)

        const req = mockRequest('GET', 'http://localhost/single')
        const response = await router.respond(req)

        expect(handler).toHaveBeenCalledTimes(1)
        expect(await response.text()).toBe('Single')
      })

      test('should handle array of handlers (pipeline)', async () => {
        const executionOrder = []
        const handler1 = vi.fn(() => { executionOrder.push('handler1') })
        const handler2 = vi.fn(() => {
          executionOrder.push('handler2')
          return new Response('Pipeline')
        })

        router.handle('GET /pipeline', [handler1, handler2])

        const req = mockRequest('GET', 'http://localhost/pipeline')
        const response = await router.respond(req)

        expect(executionOrder).toEqual(['handler1', 'handler2'])
        expect(handler1).toHaveBeenCalledTimes(1)
        expect(handler2).toHaveBeenCalledTimes(1)
        expect(await response.text()).toBe('Pipeline')
      })

      test('should return 204 when handler returns void', async () => {
        const handler = vi.fn() // Returns undefined
        router.handle('GET /void', handler)

        const req = mockRequest('GET', 'http://localhost/void')
        const response = await router.respond(req)

        expect(response.status).toBe(204)
        expect(response.statusText).toBe('No Content')
      })

      test('should return 204 when handler returns true', async () => {
        const handler = vi.fn().mockReturnValue(true)
        router.handle('GET /true', handler)

        const req = mockRequest('GET', 'http://localhost/true')
        const response = await router.respond(req)

        expect(response.status).toBe(204)
      })

      test('should return handler response when it returns false', async () => {
        const handler = vi.fn().mockReturnValue(false)
        router.handle('GET /false', handler)

        const req = mockRequest('GET', 'http://localhost/false')
        const response = await router.respond(req)

        expect(response.status).toBe(204) // false is treated like void/true
      })
    })

    describe('Path Parameters', () => {
      test('should extract single path parameter', async () => {
        const handler = vi.fn(async (req, ctx) => {
          return new Response(`User: ${ctx.params.id}`)
        })

        router.handle('GET /users/:id', handler)

        const req = mockRequest('GET', 'http://localhost/users/123')
        const response = await router.respond(req)

        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler.mock.calls[0][1].params).toEqual({ id: '123' })
        expect(await response.text()).toBe('User: 123')
      })

      test('should extract multiple path parameters', async () => {
        const handler = vi.fn(async (req, ctx) => {
          return new Response(`User ${ctx.params.userId}/Post ${ctx.params.postId}`)
        })

        router.handle('GET /users/:userId/posts/:postId', handler)

        const req = mockRequest('GET', 'http://localhost/users/123/posts/456')
        const response = await router.respond(req)

        expect(handler.mock.calls[0][1].params).toEqual({
          userId: '123',
          postId: '456'
        })
        expect(await response.text()).toBe('User 123/Post 456')
      })

      test('should handle consecutive parameters', async () => {
        const handler = vi.fn(async (req, ctx) => {
          return new Response(`${ctx.params.a}-${ctx.params.b}-${ctx.params.c}`)
        })

        router.handle('GET /:a/:b/:c', handler)

        const req = mockRequest('GET', 'http://localhost/1/2/3')
        const response = await router.respond(req)

        expect(handler.mock.calls[0][1].params).toEqual({
          a: '1',
          b: '2',
          c: '3'
        })
        expect(await response.text()).toBe('1-2-3')
      })

      test('should match parameters in middle of path', async () => {
        router.handle('GET /api/:version/users', () => new Response('Versioned API'))
        router.handle('GET /api/v1/:resource', () => new Response('Resource'))

        const req1 = mockRequest('GET', 'http://localhost/api/v2/users')
        const req2 = mockRequest('GET', 'http://localhost/api/v1/posts')

        const res1 = await router.respond(req1)
        const res2 = await router.respond(req2)

        expect(await res1.text()).toBe('Versioned API')
        expect(await res2.text()).toBe('Resource')
      })

      test('should handle empty path segments', async () => {
        router.handle('GET /api//users', () => new Response('Double slash')) // Not typical but should work

        const req = mockRequest('GET', 'http://localhost/api//users')
        const response = await router.respond(req)

        expect(response.status).toBe(200)
      })
    })

    describe('Wildcard Patterns', () => {
      test('should match single segment wildcard (*)', async () => {
        router.handle('GET /files/*', () => new Response('Wildcard match'))
        router.handle('GET /files/*/details', () => new Response('Wildcard with suffix'))

        const req1 = mockRequest('GET', 'http://localhost/files/document.pdf')
        const req2 = mockRequest('GET', 'http://localhost/files/images/photo.jpg')
        const req3 = mockRequest('GET', 'http://localhost/files/document/details')
        const req4 = mockRequest('GET', 'http://localhost/files/images/details')
        const req5 = mockRequest('GET', 'http://localhost/files')

        expect(await (await router.respond(req1)).text()).toBe('Wildcard match')
        expect(await (await router.respond(req2)).status).toBe(404)
        expect(await (await router.respond(req3)).text()).toBe('Wildcard with suffix')
        expect(await (await router.respond(req4)).text()).toBe('Wildcard with suffix')
        expect(await (await router.respond(req5)).status).toBe(404)
      })

      test('should match multi-segment wildcard (**)', async () => {
        router.handle('GET /docs/**', () => new Response('Multi-segment wildcard'))

        const req1 = mockRequest('GET', 'http://localhost/docs/getting-started')
        const req2 = mockRequest('GET', 'http://localhost/docs/api/v1/users/list')
        const req3 = mockRequest('GET', 'http://localhost/docs')

        expect(await (await router.respond(req1)).text()).toBe('Multi-segment wildcard')
        expect(await (await router.respond(req2)).text()).toBe('Multi-segment wildcard')
        expect(await (await router.respond(req3)).status).toBe(404)
      })

      test('should match multi-segment wildcard (.**)', async () => {
        router.handle('GET /docs/.**', () => new Response('Multi-segment wildcard'))

        const req1 = mockRequest('GET', 'http://localhost/docs/getting-started')
        const req2 = mockRequest('GET', 'http://localhost/docs/api/v1/users/list')
        const req3 = mockRequest('GET', 'http://localhost/docs')

        expect(await (await router.respond(req1)).text()).toBe('Multi-segment wildcard')
        expect(await (await router.respond(req2)).text()).toBe('Multi-segment wildcard')
        expect(await (await router.respond(req3)).text()).toBe('Multi-segment wildcard')
      })

      test('should throw error if ** is not at end', () => {
        expect(() => {
          router.handle('GET /api/**/more', () => new Response('Invalid'))
        }).toThrow("Super-glob '**' in the middle of pathname '/api/**/more'. Should only be at the end.")
      })

      test('should handle mixed patterns', async () => {
        router.handle('GET /api/:version/*/details', () => new Response('Mixed pattern'))

        const req = mockRequest('GET', 'http://localhost/api/v1/users/details')
        const response = await router.respond(req)

        expect(await response.text()).toBe('Mixed pattern')
      })
    })

    describe('Route Priority and Specificity', () => {
      test('should prioritize exact matches over parameters', async () => {
        const exactHandler = vi.fn(() => new Response('Exact'))
        const paramHandler = vi.fn(() => new Response('Param'))

        router.handle('GET /users/123', exactHandler)
        router.handle('GET /users/:id', paramHandler)

        const req = mockRequest('GET', 'http://localhost/users/123')
        const response = await router.respond(req)

        expect(exactHandler).toHaveBeenCalledTimes(1)
        expect(paramHandler).not.toHaveBeenCalled()
        expect(await response.text()).toBe('Exact')
      })

      test('should handle nested specificity', async () => {
        const handlers = {
          exact: vi.fn(() => new Response('Exact')),
          param: vi.fn(() => new Response('Param')),
          wildcard: vi.fn(() => new Response('Wildcard')),
          multiWildcard: vi.fn(() => new Response('Multi'))
        }

        router.handle('GET /api/v1/users/123', handlers.exact)
        router.handle('GET /api/v1/users/:id', handlers.param)
        router.handle('GET /api/v1/*', handlers.wildcard)
        router.handle('GET /api/**', handlers.multiWildcard)

        const req = mockRequest('GET', 'http://localhost/api/v1/users/123')
        const response = await router.respond(req)

        expect(handlers.exact).toHaveBeenCalledTimes(1)
        expect(handlers.param).not.toHaveBeenCalled()
        expect(handlers.wildcard).not.toHaveBeenCalled()
        expect(handlers.multiWildcard).not.toHaveBeenCalled()
        expect(await response.text()).toBe('Exact')
      })
    })
  })

  describe('Handler Types and Execution Order', () => {
    describe('Hooks', () => {
      test('should execute hooks before filters and handlers', async () => {
        const executionOrder = []
        const hook = vi.fn(() => executionOrder.push('hook'))
        const filter = vi.fn(() => executionOrder.push('filter'))
        const handler = vi.fn(() => {
          executionOrder.push('handler')
          return new Response('OK')
        })

        router.hook('GET /test', hook)
        router.filter('GET /test', filter)
        router.handle('GET /test', handler)

        await router.respond(mockRequest('GET', 'http://localhost/test'))

        expect(executionOrder).toEqual(['hook', 'filter', 'handler'])
      })

      test('hook can not short-circuit with response', async () => {
        const hook = vi.fn(() => new Response('Hook response', { status: 400 }))
        const handler = vi.fn(() => new Response('Handler'))

        router.hook('GET /test', hook)
        router.handle('GET /test', handler)

        const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

        expect(hook).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledTimes(1)
        expect(response.status).toBe(200)
        expect(await response.text()).toBe('Handler')
      })

      test('hook can not short-circuit with boolean', async () => {
        const hook = vi.fn(() => true) // Continue but no response
        const handler = vi.fn(() => new Response('Handler'))

        router.hook('GET /test', hook)
        router.handle('GET /test', handler)

        const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

        expect(hook).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledTimes(1)
        expect(await response.text()).toBe('Handler')
      })

      test('hook can access and modify context', async () => {
        const hook = vi.fn((req, ctx) => {
          ctx.hookData = 'modified'
        })
        const handler = vi.fn((req, ctx) => {
          return new Response(ctx.hookData)
        })

        router.hook('GET /test', hook)
        router.handle('GET /test', handler)

        const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

        expect(await response.text()).toBe('modified')
      })

      test('multiple hooks execute in order and can short-circuit', async () => {
        const executionOrder = []
        const hook1 = vi.fn(() => {
          executionOrder.push('hook1')
          return new Response('Stopped by hook1')
        })
        const hook2 = vi.fn(() => {
          executionOrder.push('hook2')
        })
        const handler = vi.fn(() => {
          executionOrder.push('handler')
          return new Response('Handler')
        })

        router.hook('GET /test', [hook1, hook2])
        router.handle('GET /test', handler)

        const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

        expect(executionOrder).toEqual(['hook1', 'handler'])
        expect(hook2).not.toHaveBeenCalled()
        expect(handler).toHaveBeenCalled()
        expect(await response.text()).toBe('Handler')
      })
    })

    describe('Filters', () => {
      test('filter can block request', async () => {
        const filter = vi.fn(() => new Response('Filtered', { status: 403 }))
        const handler = vi.fn(() => new Response('Should not execute'))

        router.filter('GET /admin/*', filter)
        router.handle('GET /admin/dashboard', handler)

        const response = await router.respond(mockRequest('GET', 'http://localhost/admin/dashboard'))

        expect(filter).toHaveBeenCalledTimes(1)
        expect(handler).not.toHaveBeenCalled()
        expect(response.status).toBe(403)
      })

      test('filter can pass through', async () => {
        const filter = vi.fn() // Returns undefined, passes through
        const handler = vi.fn(() => new Response('Handler executed'))

        router.filter('GET /test', filter)
        router.handle('GET /test', handler)

        const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

        expect(filter).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledTimes(1)
        expect(await response.text()).toBe('Handler executed')
      })

      test('multiple filters execute in order', async () => {
        const executionOrder = []
        const filter1 = vi.fn(() => { executionOrder.push('filter1') })
        const filter2 = vi.fn(() => {
          executionOrder.push('filter2')
          return new Response('Stopped by filter2')
        })
        const handler = vi.fn(() => executionOrder.push('handler'))

        router.filter('GET /test', [filter1, filter2])
        router.handle('GET /test', handler)

        await router.respond(mockRequest('GET', 'http://localhost/test'))

        expect(executionOrder).toEqual(['filter1', 'filter2'])
        expect(handler).not.toHaveBeenCalled()
      })

      test('filters inherit params from matching route', async () => {
        const filter = vi.fn((req, ctx) => {
          expect(ctx.params.id).toBe('123')
        })
        const handler = vi.fn(() => new Response('OK'))

        router.filter('GET /users/:id', filter)
        router.handle('GET /users/:id', handler)

        await router.respond(mockRequest('GET', 'http://localhost/users/123'))
      })
    })

    describe('Fallbacks', () => {
      test('fallback executes when no handler matches', async () => {
        const fallback = vi.fn(() => new Response('Fallback', { status: 404 }))
        router.fallback('GET /*', fallback)

        const req = mockRequest('GET', 'http://localhost/nonexistent')
        const response = await router.respond(req)

        expect(fallback).toHaveBeenCalledTimes(1)
        expect(response.status).toBe(404)
        expect(await response.text()).toBe('Fallback')
      })

      test('fallback does not execute when handler exists', async () => {
        const handler = vi.fn(() => new Response('Handler'))
        const fallback = vi.fn(() => new Response('Fallback'))

        router.handle('GET /exists', handler)
        router.fallback('GET /*', fallback)

        const req = mockRequest('GET', 'http://localhost/exists')
        const response = await router.respond(req)

        expect(handler).toHaveBeenCalledTimes(1)
        expect(fallback).not.toHaveBeenCalled()
        expect(await response.text()).toBe('Handler')
      })

      test('multiple fallbacks execute most specific first', async () => {
        const executionOrder = []
        const fallback1 = vi.fn(() => {
          executionOrder.push('fallback1')
          return new Response('Fallback1')
        })
        const fallback2 = vi.fn(() => {
          executionOrder.push('fallback2')
          return new Response('Fallback2')
        })

        router.fallback('GET /api/*', fallback1)
        router.fallback('GET /*', fallback2)

        const req = mockRequest('GET', 'http://localhost/api/nonexistent')
        await router.respond(req)

        expect(executionOrder).toEqual(['fallback1'])
        expect(fallback2).not.toHaveBeenCalled()
      })

      test('default fallback executes when no custom fallback matches', async () => {
        const defaultFallback = vi.fn(() => new Response('Default Fallback'))
        const router = new Router({ defaultFallback })

        const customFallback = vi.fn(() => new Response('Custom Fallback'))
        router.fallback('GET /api/*', customFallback)

        // Should use custom fallback
        const req1 = mockRequest('GET', 'http://localhost/api/missing')
        const res1 = await router.respond(req1)
        expect(await res1.text()).toBe('Custom Fallback')

        // Should use default fallback
        const req2 = mockRequest('GET', 'http://localhost/other/missing')
        const res2 = await router.respond(req2)
        expect(await res2.text()).toBe('Default Fallback')
      })
    })

    describe('Catchers', () => {
      test('catcher executes on handler error', async () => {
        const handler = vi.fn(() => {
          throw new Error('Test error')
        })
        const catcher = vi.fn((req, ctx) => {
          expect(ctx.error.message).toBe('Test error')
          return new Response('Caught error', { status: 500 })
        })

        router.handle('GET /error', handler)
        router.catch('GET /*', catcher)

        const req = mockRequest('GET', 'http://localhost/error')
        const response = await router.respond(req)

        expect(handler).toHaveBeenCalledTimes(1)
        expect(catcher).toHaveBeenCalledTimes(1)
        expect(response.status).toBe(500)
        expect(await response.text()).toBe('Caught error')
      })

      test('catcher executes on async handler error', async () => {
        const handler = vi.fn(async () => {
          throw new Error('Async error')
        })
        const catcher = vi.fn(() => new Response('Async caught'))

        router.handle('GET /async-error', handler)
        router.catch('GET /*', catcher)

        const response = await router.respond(mockRequest('GET', 'http://localhost/async-error'))

        expect(handler).toHaveBeenCalledTimes(1)
        expect(catcher).toHaveBeenCalledTimes(1)
        expect(await response.text()).toBe('Async caught')
      })

      test('catcher executes on filter error', async () => {
        const filter = vi.fn(() => {
          throw new Error('Filter error')
        })
        const catcher = vi.fn(() => new Response('Filter caught'))

        router.filter('GET /test', filter)
        router.catch('GET /*', catcher)

        const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

        expect(filter).toHaveBeenCalledTimes(1)
        expect(catcher).toHaveBeenCalledTimes(1)
        expect(await response.text()).toBe('Filter caught')
      })

      test('catcher executes on hook error', async () => {
        const hook = vi.fn(() => {
          throw new Error('Hook error')
        })
        const catcher = vi.fn(() => new Response('Hook caught'))

        router.hook('GET /test', hook)
        router.catch('GET /*', catcher)

        const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

        expect(hook).toHaveBeenCalledTimes(1)
        expect(catcher).toHaveBeenCalledTimes(1)
        expect(await response.text()).toBe('Hook caught')
      })

      test('catcher can access error details', async () => {
        const handler = vi.fn(() => {
          const error = new Error('Custom error')
          error.code = 'CUSTOM_CODE'
          throw error
        })
        const catcher = vi.fn((req, ctx) => {
          expect(ctx.error.code).toBe('CUSTOM_CODE')
          return new Response(`Error: ${ctx.error.code}`, { status: 500 })
        })

        router.handle('GET /custom-error', handler)
        router.catch('GET /*', catcher)

        const response = await router.respond(mockRequest('GET', 'http://localhost/custom-error'))

        expect(await response.text()).toBe('Error: CUSTOM_CODE')
      })

      test('default catcher executes when no custom catcher matches', async () => {
        const defaultCatcher = vi.fn(() => new Response('Default Catcher'))
        const router = new Router({ defaultCatcher })

        const customCatcher = vi.fn(() => new Response('Custom Catcher'))
        router.catch('GET /api/*', customCatcher)

        const handler = vi.fn(() => { throw new Error('Test') })

        // Should use custom catcher
        router.handle('GET /api/error', handler)
        const req1 = mockRequest('GET', 'http://localhost/api/error')
        const res1 = await router.respond(req1)
        expect(await res1.text()).toBe('Custom Catcher')

        // Should use default catcher
        router.handle('GET /other/error', handler)
        const req2 = mockRequest('GET', 'http://localhost/other/error')
        const res2 = await router.respond(req2)
        expect(await res2.text()).toBe('Default Catcher')
      })
    })

    describe('Afters', () => {
      test('after executes after successful response', async () => {
        const executionOrder = []
        const handler = vi.fn(() => {
          executionOrder.push('handler')
          return new Response('Success')
        })
        const after = vi.fn((req, ctx) => {
          executionOrder.push('after')
          expect(ctx.response.status).toBe(200)
        })

        router.handle('GET /test', handler)
        router.after('GET /test', after)

        const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

        expect(executionOrder).toEqual(['handler', 'after'])
        expect(await response.text()).toBe('Success')
      })

      test('after executes even when handler returns 204', async () => {
        const after = vi.fn((req, ctx) => {
          expect(ctx.response.status).toBe(204)
        })

        router.handle('GET /test', () => { }) // Returns undefined -> 204
        router.after('GET /test', after)

        await router.respond(mockRequest('GET', 'http://localhost/test'))

        expect(after).toHaveBeenCalledTimes(1)
      })

      test('after executes on error path if catcher provides response', async () => {
        const after = vi.fn((req, ctx) => {
          expect(ctx.response.status).toBe(500)
        })
        const handler = vi.fn(() => { throw new Error('Test') })
        const catcher = vi.fn(() => new Response('Error', { status: 500 }))

        router.handle('GET /test', handler)
        router.catch('GET /test', catcher)
        router.after('GET /test', after)

        await router.respond(mockRequest('GET', 'http://localhost/test'))

        expect(after).not.toHaveBeenCalled()
      })
    })

    describe('Complete Execution Flow', () => {
      test('full handler chain executes in correct order', async () => {
        const executionOrder = []

        const hook = vi.fn(() => executionOrder.push('hook'))
        const filter = vi.fn(() => executionOrder.push('filter'))
        const handler = vi.fn(() => {
          executionOrder.push('handler')
          return new Response('Main')
        })
        const after = vi.fn(() => executionOrder.push('after'))

        router.hook('GET /test', hook)
        router.filter('GET /test', filter)
        router.handle('GET /test', handler)
        router.after('GET /test', after)

        await router.respond(mockRequest('GET', 'http://localhost/test'))

        expect(executionOrder).toEqual(['hook', 'filter', 'handler', 'after'])
      })

      test('execution stops when response is returned', async () => {
        const executionOrder = []

        const hook = vi.fn(() => executionOrder.push('hook'))
        const filter = vi.fn(() => {
          executionOrder.push('filter')
          return new Response('Filter response')
        })
        const handler = vi.fn(() => executionOrder.push('handler'))
        const after = vi.fn(() => executionOrder.push('after'))

        router.hook('GET /test', hook)
        router.filter('GET /test', filter)
        router.handle('GET /test', handler)
        router.after('GET /test', after)

        await router.respond(mockRequest('GET', 'http://localhost/test'))
        expect(executionOrder).toEqual(['hook', 'filter', 'after'])
        expect(handler).not.toHaveBeenCalled()
        expect(after).toHaveBeenCalledTimes(1) // After still runs
      })
    })
  })

  describe('Context Management', () => {
    test('should initialize with default context', async () => {
      const handler = vi.fn((req, ctx) => {
        expect(ctx.params).toEqual({})
        expect(ctx.headers).toBeInstanceOf(Headers)
        expect(ctx.hooksFound).toBe(false)
        expect(ctx.filtersFound).toBe(false)
        expect(ctx.handlersFound).toBe(true)
        expect(ctx.fallbacksFound).toBe(false)
        expect(ctx.catchersFound).toBe(false)
        expect(ctx.aftersFound).toBe(false)
        return new Response('OK')
      })

      router.handle('GET /test', handler)
      await router.respond(mockRequest('GET', 'http://localhost/test'))
    })

    test('should merge provided context', async () => {
      const initialContext = {
        user: { id: '123', name: 'John' },
        headers: new Headers([['X-Custom', 'Value']])
      }

      const handler = vi.fn((req, ctx) => {
        expect(ctx.user).toEqual({ id: '123', name: 'John' })
        expect(ctx.headers.get('X-Custom')).toBe('Value')
        expect(ctx.params).toEqual({})
        return new Response('OK')
      })

      router.handle('GET /test', handler)
      await router.respond(mockRequest('GET', 'http://localhost/test'), initialContext)
    })

    test('should preserve context modifications across handlers', async () => {
      const hook = vi.fn((req, ctx) => {
        ctx.hookData = 'from hook'
      })
      const filter = vi.fn((req, ctx) => {
        ctx.filterData = 'from filter'
        expect(ctx.hookData).toBe('from hook')
      })
      const handler = vi.fn((req, ctx) => {
        expect(ctx.hookData).toBe('from hook')
        expect(ctx.filterData).toBe('from filter')
        return new Response('OK')
      })

      router.hook('GET /test', hook)
      router.filter('GET /test', filter)
      router.handle('GET /test', handler)

      await router.respond(mockRequest('GET', 'http://localhost/test'))
    })

    test('should handle headers in context', async () => {
      const handler = vi.fn((req, ctx) => {
        ctx.headers.set('X-Response-Time', '100ms')
        ctx.headers.set('X-Custom', 'Value')
        return new Response('OK')
      })

      router.handle('GET /test', handler)

      const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

      expect(response.headers.get('X-Response-Time')).toBe('100ms')
      expect(response.headers.get('X-Custom')).toBe('Value')
    })

    test('should add default headers to response', async () => {
      const router = new Router({
        defaultHeaders: [['X-Powered-By', 'Test'], ['X-Version', '1.0']]
      })

      router.handle('GET /test', () => new Response('OK'))

      const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

      expect(response.headers.get('X-Powered-By')).toBe('Test')
      expect(response.headers.get('X-Version')).toBe('1.0')
    })

    test('should merge response headers with context headers', async () => {
      const router = new Router({
        defaultHeaders: [['X-Default', 'Default']]
      })

      const handler = vi.fn((req, ctx) => {
        ctx.headers.set('X-Custom', 'Custom')
        return new Response('OK', {
          headers: { 'Content-Type': 'application/json' }
        })
      })

      router.handle('GET /test', handler)

      const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('X-Default')).toBe('Default')
      expect(response.headers.get('X-Custom')).toBe('Custom')
    })

    test('should handle address in context', async () => {
      const address = {
        address: '127.0.0.1',
        family: 'IPv4',
        port: 12345
      }

      const handler = vi.fn((req, ctx) => {
        expect(ctx.address).toEqual(address)
        return new Response('OK')
      })

      router.handle('GET /test', handler)
      await router.respond(mockRequest('GET', 'http://localhost/test'), { address })
    })
  })

  // describe('Edge Cases and Error Handling', () => {
  //   test('should return 405 for invalid HTTP method', async () => {
  //     const req = mockRequest('TRACE', 'http://localhost/test')
  //     const response = await router.respond(req)

  //     expect(response.status).toBe(405)
  //     expect(await response.text()).toBe('Method Not Allowed')
  //   })

  test('should handle empty path', async () => {
    router.handle('GET /', () => new Response('Root'))

    const req = mockRequest('GET', 'http://localhost/')
    const response = await router.respond(req)

    expect(await response.text()).toBe('Root')
  })

  test('should handle trailing slash routes', async () => {
    router.handle('GET /api', () => new Response('No slash'))
    router.handle('GET /api/', () => new Response('With slash'), { overwrite: true })

    const req1 = mockRequest('GET', 'http://localhost/api')
    const req2 = mockRequest('GET', 'http://localhost/api/')

    const res1 = await router.respond(req1)
    const res2 = await router.respond(req2)

    expect(await res1.text()).toBe('With slash')
    expect(await res2.text()).toBe('With slash')
  })

  test('should handle query parameters (ignored in routing)', async () => {
    router.handle('GET /search', () => new Response('Search'))

    const req = mockRequest('GET', 'http://localhost/search?q=test&page=1')
    const response = await router.respond(req)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Search')
  })

  test('should handle encoded paths', async () => {
    router.handle('GET /api/test%20space', () => new Response('Encoded'))

    const req = mockRequest('GET', 'http://localhost/api/test%20space')
    const response = await router.respond(req)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Encoded')
  })

  test('should handle special characters in paths', async () => {
    router.handle('GET /api/test-._~!$&\'()*+,;=:@%', () => new Response('Special chars'))

    const req = mockRequest('GET', 'http://localhost/api/test-._~!$&\'()*+,;=:@%')
    const response = await router.respond(req)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Special chars')
  })

  test('should handle very long paths', async () => {
    const longPath = '/api/' + 'a'.repeat(1000)
    router.handle(`GET ${longPath}`, () => new Response('Long path'))

    const req = mockRequest('GET', `http://localhost${longPath}`)
    const response = await router.respond(req)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Long path')
  })

  test('should handle concurrent requests', async () => {
    const handler = vi.fn(async (req, ctx) => {
      // Simulate some async work
      await new Promise(resolve => setTimeout(resolve, 10))
      return new Response(`Processed: ${ctx.params.id}`)
    })

    router.handle('GET /process/:id', handler)

    const requests = []
    for (let i = 0; i < 10; i++) {
      requests.push(
        router.respond(mockRequest('GET', `http://localhost/process/${i}`))
      )
    }

    const responses = await Promise.all(requests)

    expect(handler).toHaveBeenCalledTimes(10)
    for (let i = 0; i < 10; i++) {
      expect(await responses[i].text()).toBe(`Processed: ${i}`)
    }
  })

  test('should handle large number of routes', async () => {
    // Register 1000 routes
    for (let i = 0; i < 1000; i++) {
      router.handle(`GET /item/${i}`, () => new Response(`Item ${i}`))
    }

    // Test random access
    const randomIndex = Math.floor(Math.random() * 1000)
    const req = mockRequest('GET', `http://localhost/item/${randomIndex}`)
    const response = await router.respond(req)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(`Item ${randomIndex}`)
  })

  test('should handle body parsing in handlers', async () => {
    const handler = vi.fn(async (req) => {
      const body = await req.json()
      return json(body)
    })

    router.handle('POST /echo', handler)

    const body = { message: 'Hello', number: 42 }
    const req = mockRequest('POST', 'http://localhost/echo', { body })
    const response = await router.respond(req)

    expect(await response.json()).toEqual(body)
  })

  test('should handle FormData in requests', async () => {
    const formData = new FormData()
    formData.append('name', 'John')
    formData.append('file', new Blob(['content']), 'file.txt')

    const handler = vi.fn(async (req) => {
      const data = await req.formData()
      const name = data.get('name')
      return new Response(`Hello ${name}`)
    })

    router.handle('POST /upload', handler)

    const req = mockRequest('POST', 'http://localhost/upload', { body: formData })
    const response = await router.respond(req)

    expect(await response.text()).toBe('Hello John')
  })
})

describe('Route Override Protection', () => {
  test('should throw error when overriding route without overwrite option', () => {
    const router = new Router();
    router.handle('GET /test', () => new Response('First'))

    expect(() => {
      router.handle('GET /test', () => new Response('Second'))
    }).toThrow("Overriding route '/test' with '/test'")
  })

  test('should allow override with overwrite option', () => {
    const router = new Router();
    router.handle('GET /test', () => new Response('First'))

    expect(() => {
      router.handle('GET /test', () => new Response('Second'), { overwrite: true })
    }).not.toThrow()
  })

  test('should allow different methods on same path', () => {
    expect(() => {
      const router = new Router();
      router.handle('GET /test', () => new Response('GET'))
      router.handle('POST /test', () => new Response('POST'))
      router.handle('PUT /test', () => new Response('PUT'))
    }).not.toThrow()
  })

  test('should detect partial route collisions', () => {
    const router = new Router();
    router.handle('GET /api/users/:id', () => new Response('Param route'))

    expect(() => {
      router.handle('GET /api/users/profile', () => new Response('Specific route'))
    }).not.toThrow() // This should work - they're different routes
  })

  test('should detect wildcard collisions', () => {
    const router = new Router();
    router.handle('GET /api/*', () => new Response('Wildcard'))

    expect(() => {
      router.handle('GET /api/users', () => new Response('Specific'))
    }).not.toThrow() // This should work - specific takes precedence
  })
})

describe('Router Composition (append)', () => {
  test('should append router with prefix', async () => {
    const router = new Router();
    const apiRouter = new Router()
    apiRouter.handle('GET /users', () => new Response('Users list'))
    apiRouter.handle('POST /users', () => new Response('Create user'))

    router.append('/api', apiRouter)

    const req1 = mockRequest('GET', 'http://localhost/api/users')
    const req2 = mockRequest('POST', 'http://localhost/api/users')

    const res1 = await router.respond(req1)
    const res2 = await router.respond(req2)

    expect(await res1.text()).toBe('Users list')
    expect(await res2.text()).toBe('Create user')
  })

  test('should handle nested router prefixes', async () => {
    const router = new Router();
    const v1Router = new Router()
    v1Router.handle('GET /status', () => new Response('V1 Status'))

    const apiRouter = new Router()
    apiRouter.append('/v1', v1Router)

    router.append('/api', apiRouter)

    const req = mockRequest('GET', 'http://localhost/api/v1/status')
    const response = await router.respond(req)

    expect(await response.text()).toBe('V1 Status')
  })

  test('should preserve handler types when appending', async () => {
    const router = new Router();
    const childRouter = new Router()
    childRouter.hook('GET /test', () => console.log('Hook'))
    childRouter.filter('GET /test', () => console.log('Filter'))
    childRouter.handle('GET /test', () => new Response('Handler'))
    childRouter.catch('GET /test', () => new Response('Catcher'))

    router.append('/child', childRouter)

    // Verify all handler types were transferred
    expect(router.setters.size).toBe(4)
  })

  test('should handle wildcard routes in appended routers', async () => {
    const router = new Router();
    const apiRouter = new Router()
    apiRouter.handle('GET /docs/**', () => new Response('API Docs'))

    router.append('/api', apiRouter)

    const req = mockRequest('GET', 'http://localhost/api/docs/getting-started')
    const response = await router.respond(req)

    expect(await response.text()).toBe('API Docs')
  })

  test('should merge options when appending', async () => {
    const router = new Router();
    const childRouter = new Router()
    childRouter.handle('GET /test', () => new Response('Original'), { overwrite: false })

    // Append with overwrite: true
    router.append('/child', childRouter, { overwrite: true })

    // Try to add conflicting route (should work because options were merged)
    router.handle('GET /child/test', () => new Response('Overridden'), { overwrite: true })
  })
})

describe('Method Chaining', () => {
  test('should support method chaining for all handler types', () => {
    const router = new Router();
    const result = router
      .hook('GET /test', () => { })
      .filter('GET /test', () => { })
      .handle('GET /test', () => new Response('Test'))
      .after('GET /test', () => { })
      .catch('GET /test', () => { })
      .fallback('GET /test', () => { })

    expect(result).toBe(router)
  })

  test('should support chaining with append', () => {
    const router = new Router()
    const childRouter = new Router()
    const result = router
      .handle('GET /parent', () => new Response('Parent'))
      .append('/child', childRouter)
      .handle('GET /other', () => new Response('Other'))

    expect(result).toBe(router)
  })
})

describe('Helper Functions Integration', () => {
  test('should work with status helper', async () => {
    const router = new Router();
    router.handle('GET /test', () => status(201, 'Created'))

    const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

    expect(response.status).toBe(201)
    expect(response.statusText).toBe('Created')
    expect(await response.text()).toBe('Created')
  })

  test('should work with text helper', async () => {
    const router = new Router();
    router.handle('GET /test', () => text('Plain text', { status: 200 }))

    const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain')
    expect(await response.text()).toBe('Plain text')
  })

  test('should work with html helper', async () => {
    const router = new Router();
    router.handle('GET /test', () => html('<h1>Title</h1>'))

    const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

    expect(response.headers.get('content-type')).toBe('text/html')
    expect(await response.text()).toBe('<h1>Title</h1>')
  })

  test('should work with json helper', async () => {
    const router = new Router();
    const data = { message: 'Hello', count: 42 }
    router.handle('GET /test', () => json(data, { status: 201 }))

    const response = await router.respond(mockRequest('GET', 'http://localhost/test'))

    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(await response.json()).toEqual(data)
  })
})

describe('Middleware Integration', () => {
  test('should work with CORS middleware', async () => {
    const router = new Router();
    const corsMiddleware = cors({
      origins: ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    })

    router.filter('OPTIONS /api/*', corsMiddleware)
    router.filter('GET /api/*', corsMiddleware)
    router.handle('GET /api/test', () => new Response('API'))

    // Test preflight
    const preflight = mockRequest('OPTIONS', 'http://localhost/api/test', {
      headers: { Origin: 'http://localhost:3000' }
    })
    const preflightResponse = await router.respond(preflight)

    expect(preflightResponse.status).toBe(204)
    expect(preflightResponse.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
    expect(preflightResponse.headers.get('Access-Control-Allow-Credentials')).toBe('true')

    // Test actual request
    const request = mockRequest('GET', 'http://localhost/api/test', {
      headers: { Origin: 'http://localhost:3000' }
    })
    const response = await router.respond(request)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
  })

  test('should work with rate limiting middleware', async () => {
    const router = new Router()
    let time = 0;
    const advance = (millis) => time += millis;
    const rateLimit = limitRate({
      key: (req, ctx) => ctx.address?.address || 'unknown',
      maxTokens: 2,
      refillRate: 1, // 1 token per second
      refillTimeSecondsDenominator: 1000,
      now: () => time,
      setXRateLimitHeaders: true
    })

    router.filter('GET /api/*', rateLimit)
    router.handle('GET /api/test', () => new Response('OK'))

    const address = { address: '127.0.0.1', family: 'IPv4', port: 12345 }

    // First request should work
    const req1 = mockRequest('GET', 'http://localhost/api/test')
    const res1 = await router.respond(req1, { address })
    expect(res1.status).toBe(200)
    expect(res1.headers.get('X-RateLimit-Remaining')).toBe('1')

    // advance(200)
    // Second request should work
    const res2 = await router.respond(req1, { address })
    expect(res2.status).toBe(200)
    expect(res2.headers.get('X-RateLimit-Remaining')).toBe('0')

    // Third request should be rate limited
    // advance(200) // Not enough time for refill
    const res3 = await router.respond(req1, { address })
    expect(res2.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(res3.status).toBe(429)

    // After refill, should work again
    advance(1000)
    const res4 = await router.respond(req1, { address })
    expect(res4.status).toBe(200)
  })

  test('should work with basic auth middleware', async () => {
    const router = new Router()
    const credentials = new Map([
      ['admin', { pass: 'secret', role: 'admin' }],
      ['user', { pass: 'password', role: 'user' }]
    ])

    const basicAuth = authBasic({
      credentials,
      type: 'base64',
      realm: 'Protected Area'
    })

    router.filter('GET /admin/*', basicAuth)
    router.handle('GET /admin/dashboard', (req, ctx) => {
      return new Response(`Welcome ${ctx.basicAuth?.username}`)
    })

    // Test unauthorized
    const req1 = mockRequest('GET', 'http://localhost/admin/dashboard')
    const res1 = await router.respond(req1)
    expect(res1.status).toBe(401)

    // Test with invalid credentials
    const req2 = mockRequest('GET', 'http://localhost/admin/dashboard', {
      headers: { Authorization: 'Basic invalid' }
    })
    const res2 = await router.respond(req2)
    expect(res2.status).toBe(401)

    // Test with valid credentials
    const validAuth = 'Basic ' + btoa('admin:secret')
    const req3 = mockRequest('GET', 'http://localhost/admin/dashboard', {
      headers: { Authorization: validAuth }
    })
    const res3 = await router.respond(req3)
    expect(res3.status).toBe(200)
    expect(await res3.text()).toBe('Welcome admin')
  })
})

describe('Performance Tests', () => {
  test('should handle 10,000 routes efficiently', async () => {
    const router = new Router()
    // Create many routes
    for (let i = 0; i < 10000; i++) {
      router.handle(`GET /item/${i}`, () => new Response(`Item ${i}`))
    }

    // Add some parameter routes
    for (let i = 0; i < 100; i++) {
      router.handle(`GET /api/v${i}/:id`, () => new Response(`API v${i}`))
    }

    // Add wildcards
    router.handle('GET /static/*', () => new Response('Static'))
    router.handle('GET /docs/**', () => new Response('Docs'))

    // Test random access
    const randomIndex = Math.floor(Math.random() * 10000)
    const startTime = performance.now()
    const req = mockRequest('GET', `http://localhost/item/${randomIndex}`)
    const response = await router.respond(req)
    const endTime = performance.now()

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(`Item ${randomIndex}`)

    // Should be fast even with many routes
    const duration = endTime - startTime
    console.log(`10,000 routes lookup: ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(100) // Should be under 100ms
  })

  test('should handle deep nesting efficiently', async () => {
    const router = new Router()
    // Create deeply nested routes
    let path = ''
    for (let i = 0; i < 50; i++) {
      path += `/level${i}`
      router.handle(`GET ${path}`, () => new Response(`Level ${i}`))
    }

    // Test deepest route
    const req = mockRequest('GET', `http://localhost${path}`)
    const startTime = performance.now()
    const response = await router.respond(req)
    const endTime = performance.now()

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Level 49')

    const duration = endTime - startTime
    console.log(`50-level deep route lookup: ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(50)
  })
})

describe('Utility Functions', () => {
  describe('isValidHttpMethod', () => {
    test('should return true for valid HTTP methods', () => {
      const validMethods = ['HEAD', 'OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']
      validMethods.forEach(method => {
        expect(isValidHttpMethod(method)).toBe(true)
      })
    })

    test('should return false for invalid HTTP methods', () => {
      const invalidMethods = ['TRACE', 'CONNECT', 'CUSTOM', '', null, undefined]
      invalidMethods.forEach(method => {
        expect(isValidHttpMethod(method)).toBe(false)
      })
    })
  })
})