import { describe, test, expect } from "vitest";
import {
  parseQuery,
  parseBody,
  cors,
  authenticate,
  authorize,
  authBasic,
  authAPIKey,
  authJWT,
} from "@bepalo/router";

describe("Middlewares", () => {
  test("parseQuery should populate ctx.query from URLSearchParams", () => {
    const req = new Request("http://example.com/?a=1&b=two");
    const ctx = { url: new URL(req.url) };
    const mw = parseQuery();

    mw(req, ctx);

    expect(ctx.query).toEqual({ a: "1", b: "two" });
  });

  test("parseBody should parse JSON arrays into { values }", async () => {
    const body = JSON.stringify([1, 2, 3]);
    const req = new Request("http://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": body.length.toString() },
      body,
    });
    const ctx = { body: {} };
    const mw = parseBody();

    await mw(req, ctx);

    expect(ctx.body).toEqual({ values: [1, 2, 3] });
  });

  test("parseBody should parse text/plain into { text }", async () => {
    const req = new Request("http://example.com", {
      method: "POST",
      headers: { "Content-Type": "text/plain", "Content-Length": "5" },
      body: "hello",
    });
    const ctx = { body: {} };
    const mw = parseBody();

    await mw(req, ctx);

    expect(ctx.body).toEqual({ text: "hello" });
  });

  test("cors should set CORS headers and respond to OPTIONS with 204", () => {
    const req = new Request("http://example.com", {
      method: "OPTIONS",
      headers: { Origin: "https://example.com" },
    });
    const ctx = { headers: new Headers() };

    const mw = cors();
    const res = mw(req, ctx);

    // middleware returns a Response for OPTIONS
    expect(res).toBeDefined();
    const maybeResponse = res;
    expect(maybeResponse.status).toBe(204);
    expect(ctx.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(ctx.headers.get("Access-Control-Allow-Methods")).toBeTruthy();
    expect(ctx.headers.get("Access-Control-Allow-Headers")).toBeTruthy();
  });

  test("authenticate should return 401 when parseAuth returns null", () => {
    const mw = authenticate({ parseAuth: () => null });
    const req = new Request("http://example.com");
    const ctx = {};

    const res = mw(req, ctx);

    expect(res.status).toBe(401);
  });

  test("authenticate should set ctx.auth when parseAuth returns Auth", () => {
    const authObj = { id: "1", role: "user" };
    const mw = authenticate({ parseAuth: () => authObj });
    const req = new Request("http://example.com");
    const ctx = {};

    const res = mw(req, ctx);

    expect(ctx.auth).toEqual(authObj);
    expect(res).toBeUndefined();
  });

  test("authorize should return 401 when no auth present", () => {
    const mw = authorize({ allowRole: (r) => r === "admin" });
    const req = new Request("http://example.com");
    const ctx = {};

    const res = mw(req, ctx);

    expect(res.status).toBe(401);
  });

  test("authorize should forbid when role not allowed", () => {
    const mw = authorize({ allowRole: (r) => r === "admin" });
    const req = new Request("http://example.com");
    const ctx = { auth: { role: "user" } };

    const res = mw(req, ctx);

    expect(res.status).toBe(403);
  });

  test("authBasic should authenticate raw credentials and set ctx property", () => {
    const creds = new Map();
    creds.set("john", { password: "secret", role: "user" });
    const mw = authBasic({ credentials: creds, type: "raw" });
    const req = new Request("http://example.com", {
      headers: { Authorization: "Basic john:secret" },
    });
    const ctx = { headers: new Headers() };

    const res = mw(req, ctx);

    expect(res).toBeUndefined();
    expect(ctx.basicAuth).toEqual({ username: "john", role: "user" });
  });

  test("authAPIKey should set ctx when key verified", () => {
    const mw = authAPIKey({ verify: (k) => k === "goodkey" });
    const req = new Request("http://example.com", {
      headers: { "X-API-Key": "goodkey" },
    });
    const ctx = {};

    const res = mw(req, ctx);

    expect(ctx.apiKeyAuth.apiKey).toBe("goodkey");
    expect(res).toBeUndefined();
  });

  test("authJWT should verify token and populate ctx", () => {
    const jwt = {
      verifySync: (token) => ({ payload: { id: "1", role: "user" }, error: null }),
    };
    const mw = authJWT({ jwt });
    const req = new Request("http://example.com", {
      headers: { Authorization: "Bearer sometoken" },
    });
    const ctx = {};

    const res = mw(req, ctx);

    expect(ctx.jwtAuth.token).toBe("sometoken");
    expect(ctx.jwtAuth.payload).toEqual({ id: "1", role: "user" });
    expect(res).toBeUndefined();
  });

  test("parseBody should return 415 for unsupported content-type", async () => {
    const req = new Request("http://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: "<xml/>",
    });
    const ctx = {};
    const mw = parseBody();

    const res = await mw(req, ctx);

    expect(res.status).toBe(415);
  });

  test("parseBody should return 400 on malformed payload", async () => {
    const req = new Request("http://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not: valid json",
    });
    const ctx = { body: {} };
    const mw = parseBody();

    const res = await mw(req, ctx);

    expect(res.status).toBe(400);
  });

  test("limitRate should throw when neither refillInterval nor refillRate provided", () => {
    expect(() =>
      // @ts-ignore - intentionally missing refill config
      require("@bepalo/router").limitRate({ key: () => "id", maxTokens: 10 }),
    ).toThrow();
  });

  test("limitRate with refillInterval should decrement tokens and return 429 when exhausted", () => {
    const { limitRate } = require("@bepalo/router");
    const mw = limitRate({
      key: () => "client1",
      refillInterval: 1000000,
      maxTokens: 1,
      setXRateLimitHeaders: true,
    });
    const req = new Request("http://example.com");
    const ctx = { headers: new Headers() };

    const r1 = mw(req, ctx);
    expect(r1).toBeUndefined();
    expect(ctx.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(ctx.headers.get("X-RateLimit-Remaining")).toBe("0");

    const r2 = mw(req, ctx);
    expect(r2.status).toBe(429);
  });

  test("cors throws when credentials true with wildcard origin", () => {
    const mw = cors({ credentials: true });
    const req = new Request("http://example.com", {
      headers: { Origin: "https://example.com" },
    });
    const ctx = { headers: new Headers() };

    expect(() => mw(req, ctx)).toThrow(
      "CORS: Cannot use credentials with wildcard origin",
    );
  });

  test("authBasic should return 401 for invalid credentials and set WWW-Authenticate header", () => {
    const creds = new Map();
    creds.set("john", { pass: "secret", role: "user" });
    const mw = authBasic({ credentials: creds, type: "raw" });
    const req = new Request("http://example.com", {
      headers: { Authorization: "Basic john:wrong" },
    });
    const ctx = { headers: new Headers() };

    const res = mw(req, ctx);

    expect(res.status).toBe(401);
    expect(ctx.headers.get("WWW-Authenticate")).toBeTruthy();
  });

  test("authAPIKey should return 401 when header missing or invalid", () => {
    const mw = authAPIKey({ verify: (k) => k === "goodkey" });
    const req = new Request("http://example.com");
    const ctx = {};

    const res = mw(req, ctx);

    expect(res.status).toBe(401);
  });

  test("authJWT should return 401 when Authorization header missing", () => {
    const mw = authJWT({ jwt: { verifySync: () => ({ payload: null, error: null }) } });
    const req = new Request("http://example.com");
    const ctx = {};

    const res = mw(req, ctx);

    expect(res.status).toBe(401);
  });

  test("authenticate checkOnly should return false instead of response", () => {
    const mw = authenticate({ parseAuth: () => null, checkOnly: true });
    const req = new Request("http://example.com");
    const ctx = {};

    const res = mw(req, ctx);

    expect(res).toBe(false);
  });
});
