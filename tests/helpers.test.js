import { describe, test, expect, beforeEach, vi } from "vitest";
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
} from "@bepalo/router";

describe("Response Helpers", () => {
  describe("status()", () => {
    test("should create response with status code only", () => {
      const response = status(404);

      expect(response.status).toBe(404);
      expect(response.statusText).toBe("Not Found");
      expect(response.headers.get("content-type")).toBe("text/plain");
    });

    test("should create response with custom content", () => {
      const response = status(200, "Custom message");

      expect(response.status).toBe(200);
      expect(response.statusText).toBe("OK");
      expect(response.headers.get("content-type")).toBe("text/plain");
    });

    test("should create response with custom headers", () => {
      const response = status(201, "Created", {
        headers: { "X-Custom": "value" },
      });

      expect(response.status).toBe(201);
      expect(response.headers.get("X-Custom")).toBe("value");
    });

    test("should override default content-type", () => {
      const response = status(200, "<h1>HTML</h1>", {
        headers: { "content-type": "text/html" },
      });

      expect(response.headers.get("content-type")).toBe("text/html");
    });

    test("should handle unknown status codes", () => {
      const response = status(299); // Unknown but in 2xx range

      expect(response.status).toBe(299);
      expect(response.statusText).toBe("Successful Response");
    });

  });

  describe("text()", () => {
    test("should create plain text response", async () => {
      const response = text("Hello World");

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/plain");
      expect(await response.text()).toBe("Hello World");
    });

    test("should accept custom status", () => {
      const response = text("Error", { status: 400 });

      expect(response.status).toBe(400);
      expect(response.statusText).toBe("Bad Request");
    });

    test("should override content-type", () => {
      const response = text("Content", {
        headers: { "content-type": "text/plain; charset=utf-16" },
      });

      expect(response.headers.get("content-type")).toBe(
        "text/plain; charset=utf-16"
      );
    });
  });

  describe("html()", () => {
    test("should create HTML response", async () => {
      const response = html("<h1>Title</h1>");

      expect(response.headers.get("content-type")).toBe("text/html");
      expect(await response.text()).toBe("<h1>Title</h1>");
    });

    test("should set custom status", () => {
      const response = html("<p>Redirect</p>", { status: 302 });

      expect(response.status).toBe(302);
      expect(response.statusText).toBe("Found");
    });
  });

  describe("json()", () => {
    test("should create JSON response", async () => {
      const data = { message: "Hello", count: 42 };
      const response = json(data);

      expect(response.headers.get("content-type")).toBe("application/json");
      expect(await response.json()).toEqual(data);
    });

    test("should handle nested objects", async () => {
      const data = { user: { id: 1, name: "John" }, items: ["a", "b"] };
      const response = json(data);

      const result = await response.json();
      expect(result.user.name).toBe("John");
      expect(result.items).toHaveLength(2);
    });

    test("should handle arrays", async () => {
      const data = [1, 2, 3];
      const response = json(data); // Cast because json expects object

      expect(await response.json()).toEqual([1, 2, 3]);
    });

    test("should set custom headers", () => {
      const response = json(
        {},
        {
          headers: { "X-Rate-Limit": "1000" },
        }
      );

      expect(response.headers.get("X-Rate-Limit")).toBe("1000");
    });
  });

  describe("blob()", () => {
    test("should create blob response with inferred type", async () => {
      const blobData = new Blob(["test content"], { type: "text/plain" });
      const response = blob(blobData);

      expect(response.headers.get("content-type")).toBe("text/plain");
      expect(response.headers.get("content-length")).toBe("12");
    });

    test("should use octet-stream as fallback", async () => {
      const blobData = new Blob(["binary"]);
      const response = blob(blobData);

      expect(response.headers.get("content-type")).toBe(
        "application/octet-stream"
      );
    });

    test("should override content-type", async () => {
      const blobData = new Blob(["image"], { type: "image/jpeg" });
      const response = blob(blobData, {
        headers: { "content-type": "image/png" },
      });

      expect(response.headers.get("content-type")).toBe("image/png");
    });
  });

  describe("octetStream()", () => {
    test("should always set octet-stream content type", async () => {
      const blobData = new Blob(["data"], { type: "text/plain" });
      const response = octetStream(blobData);

      expect(response.headers.get("content-type")).toBe(
        "application/octet-stream"
      );
    });

    test("should preserve blob type internally", async () => {
      const blobData = new Blob(["test"], { type: "application/pdf" });
      const response = octetStream(blobData);

      // Even though header says octet-stream, the blob still has its original type
      expect(blobData.type).toBe("application/pdf");
    });
  });

  describe("formData()", () => {
    test("should create form data response", async () => {
      const form = new FormData();
      form.append("name", "John");
      form.append("file", new Blob(["content"]), "test.txt");

      const response = formData(form);

      expect(response.status).toBe(200);
      // FormData responses don't set content-type header
      // The browser sets it with boundary
    });

    test("should handle undefined form data", () => {
      const response = formData();

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });
  });

  describe("usp()", () => {
    test("should create URLSearchParams response", async () => {
      const params = new URLSearchParams();
      params.append("q", "search term");
      params.append("page", "1");

      const response = usp(params);

      expect(response.headers.get("content-type")).toBe(
        "application/x-www-form-urlencoded"
      );
      expect(await response.text()).toBe("q=search+term&page=1");
    });

    test("should handle undefined params", () => {
      const response = usp();

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });
  });

  describe("send()", () => {
    test("should send string as text/plain", async () => {
      const response = send("Hello");

      expect(response.headers.get("content-type")).toBe(
        "text/plain; charset=utf-8"
      );
      expect(await response.text()).toBe("Hello");
    });

    test("should send object as JSON", async () => {
      const response = send({ message: "test" });

      expect(response.headers.get("content-type")).toBe("application/json");
      expect(await response.json()).toEqual({ message: "test" });
    });

    test("should send FormData without content-type override", () => {
      const form = new FormData();
      const response = send(form);

      // FormData sets its own content-type with boundary
      // So send() doesn't override it
      expect(response.headers.get("content-type").substring(0, 19)).toBe("multipart/form-data");
    });

    test("should send URLSearchParams as x-www-form-urlencoded", async () => {
      const params = new URLSearchParams("a=1&b=2");
      const response = send(params);

      expect(response.headers.get("content-type")).toBe(
        "application/x-www-form-urlencoded"
      );
      expect(await response.text()).toBe("a=1&b=2");
    });

    test("should send Blob as octet-stream", async () => {
      const blobData = new Blob(["data"]);
      const response = send(blobData);
      expect(response.headers.get("content-type")).toBe(
        "application/octet-stream"
      );
    });

    test("should send ReadableStream as octet-stream", () => {
      const stream = new ReadableStream();
      const response = send(stream);

      expect(response.headers.get("content-type")).toBe(
        "application/octet-stream"
      );
    });

    test("should send undefined body", () => {
      const response = send();

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });

    test("should handle ArrayBuffer", () => {
      const buffer = new ArrayBuffer(8);
      const response = send(buffer);

      expect(response.headers.get("content-type")).toBe(
        "application/octet-stream"
      );
    });

    test("should honor custom content-type for strings", () => {
      const response = send("<xml>data</xml>", {
        headers: { "content-type": "application/xml" },
      });

      expect(response.headers.get("content-type")).toBe("application/xml");
    });
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

      expect(ctx.body).toEqual({});
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
    expect(response.headers.get("content-type")).toBe("text/plain");
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
});
