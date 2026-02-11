import { describe, test, expect, vi } from "vitest";
import {
  status,
  text,
  html,
  json,
  blob,
  octetStream,
  formData,
  usp,
  send,
  setCookie,
  clearCookie,
  parseCookieFromRequest,
  parseCookie,
  parseBody,
  respondWith,
  respondWithCatcher,
  redirect,
} from "@bepalo/router";

describe("Response Helpers", () => {
  describe("status / redirect", () => {
    test("status sets code and default text-type header when body present", () => {
      const res = status(404, "not found");
      expect(res.status).toBe(404);
      expect(res.statusText).toBe("Not Found");
      expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    });

    test("status with null body does not set content-type", () => {
      const res = status(204, null);
      expect(res.status).toBe(204);
      expect(res.headers.get("content-type")).toBeNull();
    });

    test("redirect sets Location and statusText", () => {
      const res = redirect("/to");
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/to");
      expect(res.statusText).toBe("Found");
    });
  });

  describe("primitive response creators (text, html, json)", () => {
    test("text returns text/plain and preserves content", async () => {
      const res = text("hi");
      expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
      expect(await res.text()).toBe("hi");
    });

    test("html returns text/html", async () => {
      const res = html("<p>x</p>");
      expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(await res.text()).toBe("<p>x</p>");
    });

    test("json sets application/json; charset=utf-8 and serializes body", async () => {
      const data = { a: 1 };
      const res = json(data);
      expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
      expect(await res.json()).toEqual(data);
    });
  });

  describe("binary and streaming responses", () => {
    test("blob sets inferred content-type and content-length", () => {
      const b = new Blob(["hello"], { type: "text/plain" });
      const res = blob(b);
      expect(res.headers.get("content-type")).toBe("text/plain");
      expect(res.headers.get("content-length")).toBe(String(b.size));
    });

    test("octetStream forces application/octet-stream and length for buffers", () => {
      const buf = new ArrayBuffer(12);
      const res = octetStream(buf);
      expect(res.headers.get("content-type")).toBe("application/octet-stream");
      expect(res.headers.get("content-length")).toBe("12");
    });
  });

  describe("form and url responses", () => {
    test("formData can return a FormData body", () => {
      const f = new FormData();
      f.append("k", "v");
      const res = formData(f);
      expect(res.status).toBe(200);
    });

    test("usp returns application/x-www-form-urlencoded and text body", async () => {
      const params = new URLSearchParams({ q: "a b", p: "1" });
      const res = usp(params);
      expect(res.headers.get("content-type")).toBe("application/x-www-form-urlencoded");
      expect(await res.text()).toContain("q=a+b");
    });
  });

  describe("send() convenience", () => {
    test("send string defaults to text/plain; charset=utf-8", async () => {
      const res = send("ok");
      expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
      expect(await res.text()).toBe("ok");
    });

    test("send object returns JSON response", async () => {
      const res = send({ x: 1 });
      expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
      expect(await res.json()).toEqual({ x: 1 });
    });

    test("send respects explicit custom content-type header", async () => {
      const res = send({ x: 2 }, { headers: { "content-type": "application/custom" } });
      expect(res.headers.get("content-type")).toBe("application/custom");
      expect(await res.json()).toEqual({ x: 2 });
    });
  });

describe("Cookie Helpers", () => {
  describe("setCookie()", () => {
    test("should create basic cookie tuple", () => {
      const [header, value] = setCookie("session", "abc123");

      expect(header).toBe("Set-Cookie");
      expect(value).toBe("session=abc123");
    });

    test("should include path option", () => {
      const [, value] = setCookie("session", "abc123", { path: "/admin" });

      expect(value).toContain("session=abc123");
      expect(value).toContain("Path=/admin");
    });

    test("should include domain option", () => {
      const [, value] = setCookie("session", "abc123", {
        domain: ".example.com",
      });

      expect(value).toContain("Domain=.example.com");
    });

    test("should include expires option with Date", () => {
      const date = new Date("2024-12-31");
      const [, value] = setCookie("session", "abc123", { expires: date });

      expect(value).toContain(`Expires=${date.toUTCString()}`);
    });

    test("should include expires option with string", () => {
      const dateStr = "2024-12-31";
      const [, value] = setCookie("session", "abc123", { expires: dateStr });

      expect(value).toContain("Expires=");
    });

    test("should include maxAge option", () => {
      const [, value] = setCookie("session", "abc123", { maxAge: 3600 });

      expect(value).toContain("Max-Age=3600");
    });

    test("should include httpOnly option", () => {
      const [, value] = setCookie("session", "abc123", { httpOnly: true });

      expect(value).toContain("HttpOnly");
    });

    test("should include secure option", () => {
      const [, value] = setCookie("session", "abc123", { secure: true });

      expect(value).toContain("Secure");
    });

    test("should include sameSite option", () => {
      const [, value] = setCookie("session", "abc123", { sameSite: "Strict" });

      expect(value).toContain("SameSite=Strict");
    });

    test("should include all options", () => {
      const date = new Date();
      const [, value] = setCookie("session", "abc123", {
        path: "/",
        domain: ".example.com",
        expires: date,
        maxAge: 3600,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      });

      expect(value).toContain("session=abc123");
      expect(value).toContain("Path=/");
      expect(value).toContain("Domain=.example.com");
      expect(value).toContain("Expires=");
      expect(value).toContain("Max-Age=3600");
      expect(value).toContain("HttpOnly");
      expect(value).toContain("Secure");
      expect(value).toContain("SameSite=Lax");
    });
  });

  describe("clearCookie()", () => {
    test("should create cookie clear tuple", () => {
      const [header, value] = clearCookie("session");

      expect(header).toBe("Set-Cookie");
      expect(value).toContain("session=");
      expect(value).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    });

    test("should include path option when clearing", () => {
      const [, value] = clearCookie("session", { path: "/admin" });

      expect(value).toContain("Path=/admin");
    });

    test("should set maxAge to 0 when provided", () => {
      const [, value] = clearCookie("session", { maxAge: 3600 });

      expect(value).toContain("Max-Age=3600");
    });
  });

  describe("parseCookieFromRequest()", () => {
    test("should parse simple cookie", () => {
      const req = new Request("http://example.com", {
        headers: { Cookie: "session=abc123; theme=dark" },
      });

      const cookie = parseCookieFromRequest(req);

      expect(cookie).toEqual({
        session: "abc123",
        theme: "dark",
      });
    });

    test("should decode URI components", () => {
      const req = new Request("http://example.com", {
        headers: { Cookie: "name=John%20Doe; city=New%20York" },
      });

      const cookie = parseCookieFromRequest(req);

      expect(cookie?.name).toBe("John Doe");
      expect(cookie?.city).toBe("New York");
    });

    test("should handle malformed cookie", () => {
      const req = new Request("http://example.com", {
        headers: { Cookie: "=value; key=; =; key=value=" },
      });

      const cookie = parseCookieFromRequest(req);

      // Only valid key-value pairs should be parsed
      expect(cookie).toEqual({});
    });

    test("should handle no cookie header", () => {
      const req = new Request("http://example.com");

      const cookie = parseCookieFromRequest(req);

      expect(cookie).toBeUndefined();
    });

    test("should handle empty cookie string", () => {
      const req = new Request("http://example.com", {
        headers: { Cookie: "" },
      });

      const cookie = parseCookieFromRequest(req);

      expect(cookie).toEqual({});
    });

    test("should handle extra whitespace", () => {
      const req = new Request("http://example.com", {
        headers: { Cookie: "  session = abc123  ;  theme = dark  " },
      });

      const cookie = parseCookieFromRequest(req);

      expect(cookie).toEqual({
        session: "abc123",
        theme: "dark",
      });
    });
  });

  describe("parseCookie()", () => {
    test("should add cookie to ctx object", () => {
      const req = new Request("http://example.com", {
        headers: { Cookie: "session=abc123" },
      });

      const ctx = { cookie: {} };
      const middleware = parseCookie();

      middleware(req, ctx);

      expect(ctx.cookie).toEqual({ session: "abc123" });
    });

    test("should work with existing ctx", () => {
      const req = new Request("http://example.com", {
        headers: { Cookie: "session=abc123" },
      });

      const ctx = { cookie: {}, other: "value" };
      const middleware = parseCookie();

      middleware(req, ctx);

      expect(ctx.cookie).toEqual({ session: "abc123" });
      expect(ctx.other).toBe("value");
    });
  });
});

describe("Body Parsing Helpers", () => {
  describe("parseBody()", () => {
    test("should parse JSON body", async () => {
      const body = JSON.stringify({ name: "John", age: 30 });
      const req = new Request("http://example.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": body.length.toFixed() },
        body,
      });

      const ctx = { body: {} };
      const middleware = parseBody();

      await middleware(req, ctx);

      expect(ctx.body).toEqual({ name: "John", age: 30 });
    });

    test("should handle non-object JSON", async () => {
      const req = new Request("http://example.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("string value"),
      });

      const ctx = { body: {} };
      const middleware = parseBody();

      await middleware(req, ctx);

      expect(ctx.body).toEqual({ value: "string value" });
    });

    test("should handle invalid JSON", async () => {
      const req = new Request("http://example.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      const ctx = { body: {} };
      const middleware = parseBody();

      await middleware(req, ctx);

      expect(ctx.body).toEqual({});
    });

    test("should handle GET request (no body)", async () => {
      const req = new Request("http://example.com", {
        method: "GET",
      });

      const ctx = { body: {} };
      const middleware = parseBody();

      await middleware(req, ctx);

      expect(ctx.body).toEqual({});
    });
  });
});

describe("Response Composition", () => {
  describe("respondWith()", () => {
    test("should execute handlers in order", async () => {
      const handler1 = vi.fn((req, ctx) => {
        ctx.order = "first";
      });
      const handler2 = vi.fn((req, ctx) => {
        ctx.order += " second";
        return text(`Order: ${ctx.order}`);
      });

      const composed = respondWith({}, handler1, handler2);
      const req = new Request("http://example.com");
      const response = await composed(req);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(await response.text()).toBe("Order: first second");
    });

    test("should stop when handler returns response", async () => {
      const handler1 = vi.fn(() => text("Early return"));
      const handler2 = vi.fn(() => text("Should not execute"));

      const composed = respondWith(null, handler1, handler2);
      const response = await composed(new Request("http://example.com"));

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(await response.text()).toBe("Early return");
    });

    test("should handle async handlers", async () => {
      const handler1 = vi.fn(async (req, ctx) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        ctx.async = "done";
      });
      const handler2 = vi.fn((req, ctx) => {
        return text(ctx.async);
      });

      const composed = respondWith({}, handler1, handler2);
      const response = await composed(new Request("http://example.com"));

      expect(await response.text()).toBe("done");
    });

    test("should return default 200 OK if no handler returns response", async () => {
      const handler1 = vi.fn((req, ctx) => {
        ctx.processed = true;
      });
      const handler2 = vi.fn((req, ctx) => {
        // Doesn't return response
      });

      const composed = respondWith({}, handler1, handler2);
      const response = await composed(new Request("http://example.com"));

      expect(response.status).toBe(204);
      expect(await response.text()).toBe("");
    });

    test("should merge ctx from multiple handlers", async () => {
      const handler1 = vi.fn((req, ctx) => {
        ctx.user = { id: 1 };
      });
      const handler2 = vi.fn((req, ctx) => {
        ctx.role = "admin";
      });
      const handler3 = vi.fn((req, ctx) => {
        return json({ ...ctx.user, role: ctx.role });
      });

      const composed = respondWith({}, handler1, handler2, handler3);
      const response = await composed(new Request("http://example.com"));

      const data = await response.json();
      expect(data).toEqual({ id: 1, role: "admin" });
    });

    test("should work with parseCookie and parseBody", async () => {
      const body = JSON.stringify({ action: "login" })
      const req = new Request("http://example.com", {
        method: "POST",
        headers: {
          Cookie: "session=abc123",
          "Content-Type": "application/json",
          "Content-Length": body.length.toFixed()
        },
        body,
      });

      const composed = respondWith({}, parseCookie(), parseBody(), (req, ctx) => {
        return json({
          session: ctx.cookie?.session,
          action: ctx.body?.action,
        });
      });

      const response = await composed(req);
      const data = await response.json();

      expect(data).toEqual({
        session: "abc123",
        action: "login",
      });
    });

    test("should handle typed ctx", async () => {

      const handler1 = (req, ctx) => {
        ctx.user = { name: "John" };
      };

      const handler2 = (req, ctx) => {
        ctx.count = 42;
      };

      const handler3 = (req, ctx) => {
        return json({ user: ctx.user, count: ctx.count });
      };

      const composed = respondWith({}, handler1, handler2, handler3);
      const response = await composed(new Request("http://example.com"));
      const data = await response.json();

      expect(data).toEqual({
        user: { name: "John" },
        count: 42,
      });
    });
  });
});

describe("Edge Cases", () => {
  test("status() with empty string content", () => {
    const response = status(201, "");

    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  });

  test("text() with special characters", async () => {
    const content = 'Hello\nWorld\t"Quotes"\u{1F600}';
    const response = text(content);

    expect(await response.text()).toBe(content);
  });

  test("json() with circular reference should throw", () => {
    const circular = { a: 1 };
    circular.self = circular;

    expect(() => json(circular)).toThrow();
  });

  test("send() with null", () => {
    const response = send(null);

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });

  test("cookie parsing with encoded equals sign", () => {
    const req = new Request("http://example.com", {
      headers: { Cookie: "data=a%3Db%26c%3Dd" },
    });

    const cookie = parseCookieFromRequest(req);

    expect(cookie?.data).toBe("a=b&c=d");
  });

  test("multiple set-cookie headers", () => {
    const cookie1 = setCookie("session", "abc123");
    const cookie2 = setCookie("theme", "dark");

    const response = text("OK", {
      headers: [cookie1, cookie2],
    });

    const setCookieHeaders = response.headers.getSetCookie();
    expect(setCookieHeaders).toHaveLength(2);
    expect(setCookieHeaders[0]).toContain("session=abc123");
    expect(setCookieHeaders[1]).toContain("theme=dark");
  });

  test("respondWith with error in handler", async () => {
    const handler1 = vi.fn(() => {
      throw new Error("Handler error");
    });
    const handler2 = vi.fn(() => text("Should not execute"));

    const composed = respondWith(null, handler1, handler2);

    await expect(composed(new Request("http://example.com"))).rejects.toThrow(
      "Handler error"
    );
  });

  describe("additional helpers", () => {
    test("redirect should set Location header and default 302 status", () => {
      const { redirect } = require("@bepalo/router");
      const res = redirect("/login");

      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/login");
      expect(res.statusText).toBe("Found");
    });

    test("status() with null content should not set content-type", () => {
      const response = status(204, null);

      expect(response.status).toBe(204);
      expect(response.headers.get("content-type")).toBeNull();
    });

    test("respondWithCatcher should return catcher's response when handler throws", async () => {
      const { respondWithCatcher, json } = require("@bepalo/router");
      const handler = () => {
        throw new Error("boom");
      };
      const catcher = (req, err) => json({ ok: false, msg: err.message }, { status: 500 });

      const composed = respondWithCatcher({}, catcher, handler);
      const res = await composed(new Request("http://example.com"));

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ ok: false, msg: "boom" });
    });

    test("send preserves custom content-type for objects when provided", async () => {
      const res = send({ a: 1 }, { headers: { "content-type": "application/custom-json" } });
      expect(res.headers.get("content-type")).toBe("application/custom-json");
      // console.log(await res.json());
      expect(await res.json()).toEqual({ a: 1 });
    });

    test("octetStream with ArrayBuffer sets content-length header", () => {
      const { octetStream } = require("@bepalo/router");
      const buf = new ArrayBuffer(16);
      const res = octetStream(buf);

      expect(res.headers.get("content-type")).toBe("application/octet-stream");
      expect(res.headers.get("content-length")).toBe("16");
    });

    test("clearCookie with explicit expires uses provided date", () => {
      const date = new Date("2030-01-01T00:00:00Z");
      const [, value] = clearCookie("sid", { expires: date });
      expect(value).toContain(`Expires=${date.toUTCString()}`);
    });
  });
});

});
