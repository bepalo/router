import { describe, test, expect, beforeEach, vi } from "vitest";
import { Router, text } from "@bepalo/router";

function mockRequest(method, url, opts = {}) {
  const headers = new Headers(opts.headers ?? {});
  const init = { method, headers };
  if (opts.body !== undefined && opts.body !== null) {
    init.body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
    headers.set("Content-Type", "application/json");
    headers.set("Content-Length", String(init.body.length));
  }
  return new Request(url, init);
}

describe("Route Override Tests", () => {
  let router;

  beforeEach(() => {
    router = new Router();
    vi.restoreAllMocks();
  });

  test("handler overwrite true replaces existing handler implementation", async () => {
    router.handle("GET /o", () => text("first"));
    router.handle("GET /o", () => text("second"), { overwrite: true });
    const res = await router.respond(mockRequest("GET", "http://localhost/o"));
    expect(await res.text()).toBe("second");
  });

  test("attempting to register same route without overwrite throws", () => {
    const r = new Router();
    r.handle("GET /dup", () => text("a"));
    expect(() => r.handle("GET /dup", () => text("b"))).toThrow();
  });

  test("overwrite works for filters too (new filter runs)", async () => {
    const calls = [];
    router.filter("GET /f", () => { calls.push("old"); });
    router.filter("GET /f", () => { calls.push("new"); }, { overwrite: true });
    router.handle("GET /f", () => text("ok"));
    await router.respond(mockRequest("GET", "http://localhost/f"));
    expect(calls).toEqual(["new"]);
  });

  test("overwrite honors normalized trailing slash when router configured", async () => {
    const r = new Router({ normalizeTrailingSlash: true });
    r.handle("GET /s", () => text("a"));
    r.handle("GET /s/", () => text("b"), { overwrite: true });
    const res = await r.respond(mockRequest("GET", "http://localhost/s"));
    expect(await res.text()).toBe("b");
  });

  test("overwrite replaces array pipeline with single handler", async () => {
    router.handle("GET /p", [ (req, ctx) => { ctx.v = 1 }, (req, ctx) => text(String(ctx.v)) ]);
    router.handle("GET /p", () => text("single"), { overwrite: true });
    const res = await router.respond(mockRequest("GET", "http://localhost/p"));
    expect(await res.text()).toBe("single");
  });

  test("overwrite only affects specified method when ALL macro present", async () => {
    router.handle("ALL /a", () => text("all"));
    router.handle("GET /a", () => text("get"), { overwrite: true });
    const rGet = await router.respond(mockRequest("GET", "http://localhost/a"));
    const rPost = await router.respond(mockRequest("POST", "http://localhost/a"));
    expect(await rGet.text()).toBe("get");
    expect(await rPost.text()).toBe("all");
  });

  test("overwrite only affects specified CRUD methods when CRUD macro present", async () => {
    router.handle("CRUD /c", () => text("crud"));
    router.handle("POST /c", () => text("post"), { overwrite: true });
    const rGet = await router.respond(mockRequest("GET", "http://localhost/c"));
    const rPost = await router.respond(mockRequest("POST", "http://localhost/c"));
    expect(await rGet.text()).toBe("crud");
    expect(await rPost.text()).toBe("post");
  });

  test("overwrite replaces filter pipeline when provided as array", async () => {
    const calls = [];
    router.filter("GET /fp", [() => calls.push('old1'), () => calls.push('old2')]);
    router.filter("GET /fp", () => calls.push('new'), { overwrite: true });
    router.handle("GET /fp", () => text('ok'));
    await router.respond(mockRequest("GET", "http://localhost/fp"));
    expect(calls).toEqual(['new']);
  });

  test("overwrite replaces after handler behavior", async () => {
    router.handle("GET /aft", () => text('ok'));
    router.after("GET /aft", (req, ctx) => { ctx.response.headers.set('X-A', '1'); });
    router.after("GET /aft", (req, ctx) => { ctx.response.headers.set('X-A', '2'); }, { overwrite: true });
    const r = await router.respond(mockRequest("GET", "http://localhost/aft"));
    expect(r.headers.get('X-A')).toBe('2');
  });

  test("overwrite replaces fallback used when no handler matches", async () => {
    router.fallback('GET /fb', () => text('old'));
    router.fallback('GET /fb', () => text('new'), { overwrite: true });
    const r = await router.respond(mockRequest('GET', 'http://localhost/fb'));
    expect(await r.text()).toBe('new');
  });

  test("normalized trailing slash: /a and /a/ map to same route when enabled", async () => {
    const r = new Router({ normalizeTrailingSlash: true });
    r.handle('GET /a', () => text('no-slash'));
    r.handle('GET /a/', () => text('with-slash'), { overwrite: true });
    const res1 = await r.respond(mockRequest('GET', 'http://localhost/a'));
    const res2 = await r.respond(mockRequest('GET', 'http://localhost/a/'));
    expect(await res1.text()).toBe('with-slash');
    expect(await res2.text()).toBe('with-slash');
  });

  test("parameter route will throw due to override with single-segment wildcard in the same position", async () => {
    router.handle('GET /users/:userId/posts/:postId', () => text('param'));
    expect(() => router.handle('GET /users/*/posts/:postId', () => text('wildcard')))
      .toThrow(new Error("Overriding route GET '/users/:userId/posts/:postId' with '/users/*/posts/:postId'"));
    const r = await router.respond(mockRequest('GET', 'http://localhost/users/42/posts/123'));
    expect(await r.text()).toBe('param');
  });

  test("multi-segment wildcard does not override explicit parameter route", async () => {
    router.handle('GET /users/:id', () => text('param'));
    router.handle('GET /users/.**', () => text('multi'));
    const r = await router.respond(mockRequest('GET', 'http://localhost/users/42'));
    expect(await r.text()).toBe('param');
  });

  test("literal segment takes precedence over parameter in same position", async () => {
    router.handle('GET /users/1234/posts/:postId', () => text('param-specific'));
    router.handle('GET /users/:userId/posts/:postId', () => text('param-param'));
    const r1 = await router.respond(mockRequest('GET', 'http://localhost/users/1234/posts/567'));
    expect(await r1.text()).toBe('param-specific');
    const r2 = await router.respond(mockRequest('GET', 'http://localhost/users/2314/posts/567'));
    expect(await r2.text()).toBe('param-param');
  });

  test("single-segment route will throw due to override on wildcard in same position", async () => {
    router.handle('GET /users/:id/1234', () => text('param-specific'));
    expect(() => router.handle('GET /users/*/1234', () => text('wildcard-specific')))
      .toThrow(new Error("Overriding route GET '/users/:id/1234' with '/users/*/1234'"));
    const r = await router.respond(mockRequest('GET', 'http://localhost/users/42/1234'));
    expect(await r.text()).toBe('param-specific');
  });

});
