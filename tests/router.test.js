import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  Router,
  json,
  text,
  status,
  authBasic,
  parseBody,
  parseCookie,
  authAPIKey,
  authJWT,
  limitRate,
  cors,
} from "@bepalo/router";

function mockRequest(method, url, opts = {}) {
  const headers = new Headers(opts.headers ?? {});
  const init = { method, headers };
  if (opts.body !== undefined && opts.body !== null) {
    if (typeof opts.body === "string" || opts.body instanceof FormData) {
      init.body = opts.body;
    } else if (opts.body instanceof URLSearchParams) {
      init.body = opts.body.toString();
      if (!headers.has("Content-Type"))
        headers.set("Content-Type", "application/x-www-form-urlencoded");
    } else {
      init.body = JSON.stringify(opts.body);
      if (!headers.has("Content-Type"))
        headers.set("Content-Type", "application/json");
    }
    headers.set("Content-Length", String(init.body?.length ?? 0));
  }
  return new Request(url, init);
}

describe("Router", () => {
  let router;

  beforeEach(() => {
    router = new Router();
    vi.restoreAllMocks();
  });

  describe("Basics", () => {
    test("registers and responds with a handler", async () => {
      router.handle("GET /hello", () => text("world"));
      const res = await router.respond(mockRequest("GET", "http://localhost/hello"));
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("world");
    });

    test("extracts path parameters", async () => {
      router.handle("GET /users/:id", (req, ctx) => text(`u:${ctx.params.id}`));
      const r = await router.respond(mockRequest("GET", "http://localhost/users/42"));
      expect(await r.text()).toBe("u:42");
    });

    test("registers handlers for all HTTP methods", async () => {
      const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
      for (const m of methods) {
        router.handle(`${m} /m/${m.toLowerCase()}`, () => text(m));
      }
      for (const m of methods) {
        const res = await router.respond(mockRequest(m, `http://localhost/m/${m.toLowerCase()}`));
        expect(res.status).toBe(200);
      }
    });

    test("registers handlers for all HTTP methods using ALL", async () => {
      const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
      router.handle(`ALL /all`, () => text("all"));
      for (const m of methods) {
        const res = await router.respond(mockRequest(m, "http://localhost/all"));
        expect(res.status).toBe(200);
      }
    });

    test("registers handlers for crud HTTP methods using CRUD", async () => {
      const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
      router.handle(`CRUD /crud`, () => text("crud"));
      for (const m of methods) {
        const res = await router.respond(mockRequest(m, "http://localhost/crud"));
        expect(res.status).toBe(200);
      }
      for (const m of ["HEAD", "OPTIONS"]) {
        const res = await router.respond(mockRequest(m, "http://localhost/crud"));
        expect(res.status).toBe(404);
      }
    });

    test("* wildcard matches one segment", async () => {
      router.handle("GET /files/*", () => text("dot-star"));
      const r1 = await router.respond(mockRequest("GET", "http://localhost/files"));
      const r2 = await router.respond(mockRequest("GET", "http://localhost/files/a"));
      expect(await r1.status).toBe(404);
      expect(await r2.text()).toBe("dot-star");
    });

    test(".* wildcard matches current path and one segment", async () => {
      router.handle("GET /files/.*", () => text("dot-star"));
      const r1 = await router.respond(mockRequest("GET", "http://localhost/files"));
      const r2 = await router.respond(mockRequest("GET", "http://localhost/files/a"));
      expect(await r1.text()).toBe("dot-star");
      expect(await r2.text()).toBe("dot-star");
    });

    test("** wildcard matches many segments", async () => {
      router.handle("GET /files/**", () => text("dot-star"));
      const r1 = await router.respond(mockRequest("GET", "http://localhost/files"));
      const r2 = await router.respond(mockRequest("GET", "http://localhost/files/a"));
      const r3 = await router.respond(mockRequest("GET", "http://localhost/files/a/b"));
      const r4 = await router.respond(mockRequest("GET", "http://localhost/files/a/b/c"));
      expect(await r1.status).toBe(404);
      expect(await r2.text()).toBe("dot-star");
      expect(await r3.text()).toBe("dot-star");
      expect(await r4.text()).toBe("dot-star");
    });

    test(".** wildcard matches current path and many segments", async () => {
      router.handle("GET /files/.**", () => text("dot-star"));
      const r1 = await router.respond(mockRequest("GET", "http://localhost/files"));
      const r2 = await router.respond(mockRequest("GET", "http://localhost/files/a"));
      const r3 = await router.respond(mockRequest("GET", "http://localhost/files/a/b"));
      const r4 = await router.respond(mockRequest("GET", "http://localhost/files/a/b/c"));
      expect(await r1.text()).toBe("dot-star");
      expect(await r2.text()).toBe("dot-star");
      expect(await r3.text()).toBe("dot-star");
      expect(await r4.text()).toBe("dot-star");
    });

    test("setRoutes throws when glob with current node '.*' used in middle of path", () => {
      expect(() => router.handle('GET /a/.*/b', () => text('x'))).toThrow();
    });

    test("setRoutes throws when super-glob '**' used in middle of path", () => {
      expect(() => router.handle('GET /a/**/b', () => text('x'))).toThrow();
    });

    test("setRoutes throws when super-glob with current node '.**' used in middle of path", () => {
      expect(() => router.handle('GET /a/.**/b', () => text('x'))).toThrow();
    });

    test("exact route takes precedence over parameter route", async () => {
      router.handle('GET /users/me', () => text('me'));
      router.handle('GET /users/:id', (req, ctx) => text(`id:${ctx.params.id}`));

      const r1 = await router.respond(mockRequest('GET', 'http://localhost/users/me'));
      const r2 = await router.respond(mockRequest('GET', 'http://localhost/users/42'));
      expect(await r1.text()).toBe('me');
      expect(await r2.text()).toBe('id:42');
    });

    test("default trailing slash routes: /api and /api/ behavior", async () => {
      router.handle("GET /api", () => text("no-slash"));
      router.handle("GET /api/", () => text("with-slash"));

      const r1 = await router.respond(mockRequest("GET", "http://localhost/api"));
      const r2 = await router.respond(mockRequest("GET", "http://localhost/api/"));

      expect(await r1.text()).toBe("no-slash");
      expect(await r2.text()).toBe("with-slash");
    });

    test("normalized trailing slash routes: /api and /api/ behavior", async () => {
      const router = new Router({
        normalizeTrailingSlash: true,
      });
      router.handle("GET /api", () => text("no-slash"));
      router.handle("GET /api/", () => text("with-slash"), { overwrite: true });

      const r1 = await router.respond(mockRequest("GET", "http://localhost/api"));
      const r2 = await router.respond(mockRequest("GET", "http://localhost/api/"));

      expect(await r1.text()).toBe("with-slash");
      expect(await r2.text()).toBe("with-slash");
    });

    test("registering same route twice without overwrite throws", () => {
      const r = new Router();
      r.handle("GET /dup", () => text("a"));
      expect(() => r.handle("GET /dup", () => text("b"))).toThrow();
    });
    
  });

  describe("Pipelines Hooks, Afters, Filters, Handlers, Fallbacks & Catchers", () => {
    test("handler type execution order is maintained", async () => {
      const handlersCalled = [];
      router.hook("GET /h", () => { handlersCalled.push("hook") });
      router.filter("GET /h", () => { handlersCalled.push("filter") });
      router.handle("GET /h", () => { handlersCalled.push("handle") });
      router.fallback("GET /h", () => { handlersCalled.push("fallback") });
      router.after("GET /h", () => { handlersCalled.push("after") });

      const r = await router.respond(mockRequest("GET", "http://localhost/h"));
      expect(handlersCalled).toEqual([
        "hook", "filter", "handle", "fallback", "after"
      ]);
    });

    test("filters can short-circuit and return a response", async () => {
      router.filter("GET /f", () => status(401));
      router.handle("GET /f", () => text("should not run"));

      const r = await router.respond(mockRequest("GET", "http://localhost/f"));
      expect(r.status).toBe(401);
    });

    test("handlers can short-circuit and return a response", async () => {
      router.handle("GET /f", () => status(401));
      router.fallback("GET /f", () => text("should not run"));

      const r = await router.respond(mockRequest("GET", "http://localhost/f"));
      expect(r.status).toBe(401);
    });

    test("filters pipeline executes all globs starting from leaf", async () => {
      let handlersCalled = [];
      router.hook("GET /h/e", () => { handlersCalled.push("hook") });
      router.filter("GET /*", () => { handlersCalled.push("filter /*") });
      router.filter("GET /**", () => { handlersCalled.push("filter /**") });
      router.filter("GET /h/*", () => { handlersCalled.push("filter /h/*") });
      router.filter("GET /h/**", () => { handlersCalled.push("filter /h/**") });
      router.filter("GET /h/e", () => { handlersCalled.push("filter") });
      router.handle("GET /h/e", () => { handlersCalled.push("handle") });
      router.fallback("GET /h/e", () => { handlersCalled.push("fallback") });
      router.after("GET /h/e", () => { handlersCalled.push("after") });
      router.filter("GET /h", () => { handlersCalled.push("filter") });

      await router.respond(mockRequest("GET", "http://localhost/h/e"));
      expect(handlersCalled).toEqual([
        "hook", "filter", "filter /h/*", "filter /h/**", "filter /**", "handle", "fallback", "after"
      ]);
      handlersCalled = [];
      await router.respond(mockRequest("GET", "http://localhost/h"));
      expect(handlersCalled).toEqual([
        "filter", "filter /*", "filter /**"
      ]);
    });

    test("filters can end only pipeline on truthy return", async () => {
      const handlersCalled = [];
      router.hook("GET /h", () => { handlersCalled.push("hook") });
      router.filter("GET /*", () => { handlersCalled.push("filter /*") });
      router.filter("GET /**", () => { handlersCalled.push("filter /**") });
      router.filter("GET /h", () => { handlersCalled.push("filter"); return true; });
      router.handle("GET /h", () => { handlersCalled.push("handle") });
      router.fallback("GET /h", () => { handlersCalled.push("fallback") });
      router.after("GET /h", () => { handlersCalled.push("after") });

      const r = await router.respond(mockRequest("GET", "http://localhost/h"));
      expect(handlersCalled).toEqual([
        "hook", "filter", "handle", "fallback", "after"
      ]);
    });

    test("catchers handle errors thrown in hooks", async () => {
      const handlersCalled = [];
      router.hook("GET /boom", () => { handlersCalled.push("hook"); throw new Error("boom"); });
      router.filter("GET /boom", () => { handlersCalled.push("filter"); });
      router.handle("GET /boom", () => { handlersCalled.push("handle"); });
      router.fallback("GET /boom", () => { handlersCalled.push("fallback"); });
      router.after("GET /boom", () => { handlersCalled.push("after"); });
      router.catch("GET /boom", (req, ctx) => json({ ok: false, e: ctx.error.message }, { status: 500 }));

      const r = await router.respond(mockRequest("GET", "http://localhost/boom"));
      expect(r.status).toBe(500);
      expect(await r.json()).toEqual({ ok: false, e: "boom" });
      expect(handlersCalled).toEqual([
        "hook"
      ]);
    });

    test("catchers handle errors thrown in afters", async () => {
      const handlersCalled = [];
      router.hook("GET /boom", () => { handlersCalled.push("hook"); });
      router.filter("GET /boom", () => { handlersCalled.push("filter"); });
      router.handle("GET /boom", () => { handlersCalled.push("handle"); });
      router.fallback("GET /boom", () => { handlersCalled.push("fallback"); });
      router.after("GET /boom", () => { handlersCalled.push("after"); throw new Error("boom"); });
      router.catch("GET /boom", (req, ctx) => json({ ok: false, e: ctx.error.message }, { status: 500 }));

      const r = await router.respond(mockRequest("GET", "http://localhost/boom"));
      expect(r.status).toBe(500);
      expect(await r.json()).toEqual({ ok: false, e: "boom" });
      expect(handlersCalled).toEqual([
        "hook", "filter", "handle", "fallback", "after"
      ]);
    });

    test("catchers handle errors thrown in filters", async () => {
      const handlersCalled = [];
      router.hook("GET /boom", () => { handlersCalled.push("hook"); });
      router.filter("GET /boom", () => { handlersCalled.push("filter"); throw new Error("boom"); });
      router.handle("GET /boom", () => { handlersCalled.push("handle"); });
      router.fallback("GET /boom", () => { handlersCalled.push("fallback"); });
      router.after("GET /boom", () => { handlersCalled.push("after"); });
      router.catch("GET /boom", (req, ctx) => json({ ok: false, e: ctx.error.message }, { status: 500 }));

      const r = await router.respond(mockRequest("GET", "http://localhost/boom"));
      expect(r.status).toBe(500);
      expect(await r.json()).toEqual({ ok: false, e: "boom" });
      expect(handlersCalled).toEqual([
        "hook", "filter"
      ]);
    });

    test("catchers handle errors thrown in handlers", async () => {
      const handlersCalled = [];
      router.hook("GET /boom", () => { handlersCalled.push("hook"); });
      router.filter("GET /boom", () => { handlersCalled.push("filter"); });
      router.handle("GET /boom", () => { handlersCalled.push("handle"); throw new Error("boom"); });
      router.fallback("GET /boom", () => { handlersCalled.push("fallback"); });
      router.after("GET /boom", () => { handlersCalled.push("after"); });
      router.catch("GET /boom", (req, ctx) => json({ ok: false, e: ctx.error.message }, { status: 500 }));

      const r = await router.respond(mockRequest("GET", "http://localhost/boom"));
      expect(r.status).toBe(500);
      expect(await r.json()).toEqual({ ok: false, e: "boom" });
      expect(handlersCalled).toEqual([
        "hook", "filter", "handle"
      ]);
    });

    test("catchers handle errors thrown in fallbacks", async () => {
      const handlersCalled = [];
      router.hook("GET /boom", () => { handlersCalled.push("hook"); });
      router.filter("GET /boom", () => { handlersCalled.push("filter"); });
      router.handle("GET /boom", () => { handlersCalled.push("handle"); });
      router.fallback("GET /boom", () => { handlersCalled.push("fallback"); throw new Error("boom"); });
      router.after("GET /boom", () => { handlersCalled.push("after"); });
      router.catch("GET /boom", (req, ctx) => json({ ok: false, e: ctx.error.message }, { status: 500 }));

      const r = await router.respond(mockRequest("GET", "http://localhost/boom"));
      expect(r.status).toBe(500);
      expect(await r.json()).toEqual({ ok: false, e: "boom" });
      expect(handlersCalled).toEqual([
        "hook", "filter", "handle", "fallback"
      ]);
    });

    test("default catchers handle errors thrown in cathcers", async () => {
      let defaultCatcherCalled = false;
      const ctx = {};
      const router = new Router({
        defaultCatcher: (req, ctx) => {
          defaultCatcherCalled = true;
          return json({ ok: false, e: ctx.error.message }, { status: 500 });
        }
      });
      const handlersCalled = [];
      router.hook("GET /boom", () => { handlersCalled.push("hook"); });
      router.filter("GET /boom", () => { handlersCalled.push("filter"); });
      router.handle("GET /boom", () => { handlersCalled.push("handle"); });
      router.fallback("GET /boom", () => { handlersCalled.push("fallback"); });
      router.after("GET /boom", () => { handlersCalled.push("after"); throw new Error("boom"); });
      router.catch("GET /boom", [() => { throw new Error("boom boom");}, (req, ctx) => json({ ok: false, e: ctx.error.message }, { status: 500 })]);

      const r = await router.respond(mockRequest("GET", "http://localhost/boom"), ctx);
      expect(defaultCatcherCalled).toBe(true);
      expect(r.status).toBe(500);
      expect(r.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
      expect(await r.json()).toEqual({ ok: false, e: "boom boom" });
      expect(handlersCalled).toEqual([
        "hook", "filter", "handle", "fallback", "after"
      ]);
    });

  });

  describe("Forward, Append & Composition", () => {
    test("forward passes headers and path to target", async () => {
      router.handle("GET /target", (req) => text(req.headers.get("X-Forwarded-Path") || "no"));
      router.handle("GET /forward", function (req, ctx) {
        return this.respond(new Request(req.url.replace('/forward', '/target'), { headers: new Headers({ 'X-Forwarded-Path': '/forward' }) }), ctx);
      });
      const r = await router.respond(mockRequest("GET", "http://localhost/forward"));
      expect(await r.text()).toBe("/forward");
    });

    test("forward with method override sets X-Forwarded-Method on new request", async () => {
      router.handle("POST /to-post", (req) => text(req.method + (req.headers.get('X-Forwarded-Method') ? '|' + req.headers.get('X-Forwarded-Method') : '')));
      router.handle("GET /from-get", function (req, ctx) {
        const headers = new Headers(req.headers);
        const url = new URL(req.url);
        url.pathname = '/to-post';
        const newReq = new Request(url.toString(), { method: 'POST', headers });
        return this.respond(newReq, ctx);
      });
      const r = await router.respond(mockRequest("GET", "http://localhost/from-get"));
      expect(await r.text()).toContain("POST");
    });

    test("append mounts another router under prefix and discards config", async () => {
      const api = new Router({ defaultHeaders: [["X-Sub", "s"]] });
      api.handle("GET /users", () => text("u-list"));
      router.append("/api", api);
      const r = await router.respond(mockRequest("GET", "http://localhost/api/users"));
      expect(await r.text()).toBe("u-list");
      expect(r.headers.get("X-Sub")).toBeNull();
    });
  });

  describe("Auth & Parsing Integrations", () => {
    test("basic auth filter blocks and allows correctly", async () => {
      const creds = new Map([["alice", { password: "pw" }]]);
      const basic = authBasic({ credentials: creds, type: "base64" });
      router.filter("GET /admin", basic);
      router.handle("GET /admin", (req, ctx) => text(`hi ${ctx.basicAuth?.username}`));

      const r1 = await router.respond(mockRequest("GET", "http://localhost/admin"));
      expect(r1.status).toBe(401);

      const auth = "Basic " + Buffer.from("alice:pw").toString("base64");
      const r2 = await router.respond(mockRequest("GET", "http://localhost/admin", { headers: { Authorization: auth } }));
      expect(await r2.text()).toBe("hi alice");
    });

    test("authAPIKey allows valid key and blocks invalid", async () => {
      const mw = authAPIKey({ verify: (k) => k === 'ok' });
      router.filter('GET /key', mw);
      router.handle('GET /key', (req, ctx) => text(ctx.apiKeyAuth.apiKey));

      const r1 = await router.respond(mockRequest('GET', 'http://localhost/key'));
      expect(r1.status).toBe(401);

      const r2 = await router.respond(mockRequest('GET', 'http://localhost/key', { headers: { 'X-API-Key': 'ok' } }));
      expect(await r2.text()).toBe('ok');
    });

    test("authJWT populates ctx when token valid", async () => {
      const jwt = { verifySync: (t) => ({ payload: { sub: '1' }, error: null }) };
      const mw = authJWT({ jwt });
      router.filter('GET /jwt', mw);
      router.handle('GET /jwt', (req, ctx) => json(ctx.jwtAuth.payload));

      const r = await router.respond(mockRequest('GET', 'http://localhost/jwt', { headers: { Authorization: 'Bearer tok' } }));
      expect(await r.json()).toEqual({ sub: '1' });
    });
  });

  describe("Advanced & Misc", () => {
    test("handler pipeline: later handler sees ctx changes", async () => {
      const h1 = (req, ctx) => { ctx.x = 1; };
      const h2 = (req, ctx) => json({ x: ctx.x });
      router.handle("GET /pipe", [h1, h2]);

      const res = await router.respond(mockRequest("GET", "http://localhost/pipe"));
      expect(await res.json()).toEqual({ x: 1 });
    });

    test("returns 204 when handler returns void/true/false treated as no content", async () => {
      router.handle("GET /void", () => {});
      const r = await router.respond(mockRequest("GET", "http://localhost/void"));
      expect(r.status).toBe(204);
    });

    test("after handlers run after response and can add headers to response in context", async () => {
      router.handle("GET /after", () => text("ok"));
      router.after("GET /after", (req, { response }) => { response.headers.set("X-After", "1"); });
      const r = await router.respond(mockRequest("GET", "http://localhost/after"));
      expect(r.headers.get("X-After")).toBe("1");
    });

    test("limitRate middleware integrated with router (refillInterval)", async () => {
      let now = 0;
      const advance = (ms) => now += ms;
      const rl = limitRate({
        key: () => "k",
        refillInterval: 1000000,
        maxTokens: 1,
        now: () => now,
      });
      router.filter("GET /rl", rl);
      router.handle("GET /rl", () => text("ok"));

      const r1 = await router.respond(mockRequest("GET", "http://localhost/rl"));
      expect(r1.status).toBe(200);

      const r2 = await router.respond(mockRequest("GET", "http://localhost/rl"));
      expect(r2.status).toBe(429);

      advance(1000000);
      const r3 = await router.respond(mockRequest("GET", "http://localhost/rl"));
      expect(r3.status).toBe(200);
    });

    test("defaultHeaders (function) are added to responses", async () => {
      const rtr = new Router({ defaultHeaders: () => [["X-Dyn", "1"]] });
      rtr.handle("GET /d", () => text("ok"));
      const res = await rtr.respond(mockRequest("GET", "http://localhost/d"));
      expect(res.headers.get("X-Dyn")).toBe("1");
    });

    test("parseBody integration: POST with JSON parsed into ctx.body", async () => {
      router.handle("POST /pb", [parseBody(), (req, ctx) => json(ctx.body)]);
      const payload = { foo: 'bar' };
      const r = await router.respond(mockRequest("POST", "http://localhost/pb", { body: payload }));
      expect(await r.json()).toEqual(payload);
    });

    test("parseCookie integration: middleware adds cookie to ctx", async () => {
      router.handle("GET /pc", [parseCookie(), (req, ctx) => json(ctx.cookie)]);
      const r = await router.respond(mockRequest("GET", "http://localhost/pc", { headers: { Cookie: 'a=1; b=two' } }));
      expect(await r.json()).toEqual({ a: '1', b: 'two' });
    });

    test("limitRate with refillRate refills tokens over time", async () => {
      let now = 0;
      const rl = limitRate({ key: () => 'k', refillRate: 1, maxTokens: 1, now: () => now, refillTimeSecondsDenominator: 1000 });
      router.filter('GET /rr', rl);
      router.handle('GET /rr', () => text('ok'));

      const r1 = await router.respond(mockRequest('GET', 'http://localhost/rr'));
      expect(r1.status).toBe(200);
      const r2 = await router.respond(mockRequest('GET', 'http://localhost/rr'));
      expect(r2.status).toBe(429);
      now += 1000;
      const r3 = await router.respond(mockRequest('GET', 'http://localhost/rr'));
      expect(r3.status).toBe(200);
    });

    test("hooks that return a Response are ignored and handler still runs", async () => {
      router.hook('GET /hx', () => text('skip'));
      router.handle('GET /hx', () => text('ok'));
      const r = await router.respond(mockRequest('GET', 'http://localhost/hx'));
      expect(await r.text()).toBe('ok');
    });

    test("invalid HTTP method returns 405 Method Not Allowed", async () => {
      const res = await router.respond("http://localhost/anything", { method: "TRACE" });
      expect(res.status).toBe(405);
    });

    test("router defaultFallback used when provided in constructor", async () => {
      const fallbackRouter = new Router({ defaultFallback: () => status(404, "notfound") });
      const r = await fallbackRouter.respond(mockRequest("GET", "http://localhost/nope"));
      expect(r.status).toBe(404);
      expect(await r.text()).toBe("notfound");
    });

    test("router defaultCatcher handles uncaught errors when no custom catcher", async () => {
      const rtr = new Router({ defaultCatcher: () => status(500, "x") });
      rtr.handle("GET /boom", () => { throw new Error("ohno"); });
      const r = await rtr.respond(mockRequest("GET", "http://localhost/boom"));
      expect(r.status).toBe(500);
      expect(await r.text()).toBe("x");
    });

  });
});
