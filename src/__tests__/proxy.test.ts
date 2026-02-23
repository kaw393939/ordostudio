import { describe, it, expect, afterEach, vi } from "vitest";

/* ── Mock next/server before any imports ───────────── */

vi.mock("next/server", () => {
  class MockNextResponse {
    status: number;
    headers: Map<string, string>;
    _body: unknown;
    _type: string;
    _url?: string;

    constructor(body: unknown, init?: { status?: number }) {
      this.status = init?.status ?? 200;
      this._body = body;
      this._type = "unknown";
      this.headers = new Map();
    }

    static next() {
      const r = new MockNextResponse(null, { status: 200 });
      r._type = "next";
      return r;
    }

    static json(body: unknown, init?: { status?: number }) {
      const r = new MockNextResponse(body, init);
      r._type = "json";
      return r;
    }

    static redirect(url: URL) {
      const r = new MockNextResponse(null, { status: 307 });
      r._type = "redirect";
      r._url = url.toString();
      return r;
    }
  }

  return { NextResponse: MockNextResponse };
});

/* ── Minimal NextRequest-like builder ──────────────── */

class FakeCookies {
  private _data: Map<string, string>;
  constructor(cookieHeader?: string) {
    this._data = new Map();
    if (cookieHeader) {
      for (const part of cookieHeader.split(";")) {
        const [k, v] = part.trim().split("=");
        if (k) this._data.set(k, v ?? "");
      }
    }
  }
  has(name: string) {
    return this._data.has(name);
  }
}

function buildRequest(
  method: string,
  pathname: string,
  options?: {
    headers?: Record<string, string>;
    cookies?: string;
  },
) {
  const headers = new Headers(options?.headers);
  return {
    method,
    url: `http://localhost:3000${pathname}`,
    nextUrl: new URL(`http://localhost:3000${pathname}`),
    headers,
    cookies: new FakeCookies(options?.cookies),
  };
}

/* ── Import proxy after mock ───────────────────────── */

import { proxy } from "../proxy";

/* ── Tests ─────────────────────────────────────────── */

describe("proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function callMiddleware(
    method: string,
    pathname: string,
    opts?: { headers?: Record<string, string>; cookies?: string },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return proxy(buildRequest(method, pathname, opts) as any);
  }

  describe("security headers", () => {
    it("sets all 6 security headers on a public page request", () => {
      const res = callMiddleware("GET", "/");

      expect(res.headers.get("strict-transport-security")).toBe(
        "max-age=63072000; includeSubDomains; preload",
      );
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("x-frame-options")).toBe("DENY");
      expect(res.headers.get("referrer-policy")).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(res.headers.get("permissions-policy")).toBe(
        "camera=(), microphone=(), geolocation=()",
      );
      expect(res.headers.get("x-dns-prefetch-control")).toBe("off");
    });

    it("sets security headers on API routes", () => {
      const res = callMiddleware("GET", "/api/v1/events");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("x-frame-options")).toBe("DENY");
    });

    it("sets CSP header with correct directives", () => {
      const res = callMiddleware("GET", "/");
      const csp = res.headers.get("content-security-policy");
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
    });

    it("CSP includes unsafe-eval in development", () => {
      vi.stubEnv("NODE_ENV", "development");
      const res = callMiddleware("GET", "/");
      const csp = res.headers.get("content-security-policy");
      expect(csp).toContain("'unsafe-eval'");
    });

    it("CSP excludes unsafe-eval in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      const res = callMiddleware("GET", "/");
      const csp = res.headers.get("content-security-policy");
      expect(csp).not.toContain("'unsafe-eval'");
    });
  });

  describe("CORS", () => {
    it("returns 204 with CORS headers on OPTIONS preflight", () => {
      vi.stubEnv("CORS_ALLOWED_ORIGINS", "http://example.com");
      const res = callMiddleware("OPTIONS", "/api/v1/events", {
        headers: { origin: "http://example.com" },
      });

      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe(
        "http://example.com",
      );
      expect(res.headers.get("access-control-allow-methods")).toContain("GET");
      expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    });

    it("sets CORS headers on API responses with allowed origin", () => {
      vi.stubEnv("CORS_ALLOWED_ORIGINS", "http://example.com");
      const res = callMiddleware("GET", "/api/v1/events", {
        headers: { origin: "http://example.com" },
      });

      expect(res.headers.get("access-control-allow-origin")).toBe(
        "http://example.com",
      );
    });

    it("does not set CORS headers for disallowed origin", () => {
      vi.stubEnv("CORS_ALLOWED_ORIGINS", "http://allowed.com");
      const res = callMiddleware("GET", "/api/v1/events", {
        headers: { origin: "http://evil.com" },
      });

      expect(res.headers.has("access-control-allow-origin")).toBe(false);
    });

    it("allows any origin when CORS_ALLOWED_ORIGINS is empty", () => {
      vi.stubEnv("CORS_ALLOWED_ORIGINS", "");
      const res = callMiddleware("GET", "/api/v1/events", {
        headers: { origin: "http://localhost:3000" },
      });

      expect(res.headers.get("access-control-allow-origin")).toBe(
        "http://localhost:3000",
      );
    });
  });

  describe("route guards", () => {
    it("redirects unauthenticated users from /admin to /login", () => {
      const res = callMiddleware("GET", "/admin");
      expect(res.status).toBe(307);
      expect(res._type).toBe("redirect");
      expect(res._url).toContain("/login");
    });

    it("redirects unauthenticated users from /admin/events to /login", () => {
      const res = callMiddleware("GET", "/admin/events");
      expect(res.status).toBe(307);
      expect(res._type).toBe("redirect");
    });

    it("redirects unauthenticated users from /account to /login", () => {
      const res = callMiddleware("GET", "/account");
      expect(res.status).toBe(307);
      expect(res._type).toBe("redirect");
    });

    it("passes through /admin when session cookie is present", () => {
      const res = callMiddleware("GET", "/admin", {
        cookies: "lms_session=abc123",
      });
      expect(res._type).toBe("next");
      expect(res.status).toBe(200);
    });

    it("returns 401 for unauthenticated /api/v1/admin requests", () => {
      const res = callMiddleware("GET", "/api/v1/admin/events");
      expect(res.status).toBe(401);
      expect(res._type).toBe("json");
    });

    it("returns 401 for unauthenticated /api/v1/account requests", () => {
      const res = callMiddleware("GET", "/api/v1/account/registrations");
      expect(res.status).toBe(401);
    });

    it("passes through /api/v1/admin with session cookie", () => {
      const res = callMiddleware("GET", "/api/v1/admin/events", {
        cookies: "lms_session=abc123",
      });
      expect(res._type).toBe("next");
    });

    it("passes through public API routes without session", () => {
      const res = callMiddleware("GET", "/api/v1/events");
      expect(res._type).toBe("next");
    });

    it("passes through public pages without session", () => {
      const res = callMiddleware("GET", "/events");
      expect(res._type).toBe("next");
    });
  });

  describe("body size limit", () => {
    it("rejects oversized POST request body", () => {
      const res = callMiddleware("POST", "/api/v1/events", {
        headers: { "content-length": "2000000" },
      });
      expect(res.status).toBe(413);
      expect(res._type).toBe("json");
    });

    it("allows POST request within limit", () => {
      const res = callMiddleware("POST", "/api/v1/events", {
        headers: { "content-length": "500" },
      });
      expect(res.status).toBe(200);
    });

    it("rejects oversized PATCH request", () => {
      const res = callMiddleware("PATCH", "/api/v1/events/test", {
        headers: { "content-length": "2000000" },
      });
      expect(res.status).toBe(413);
    });

    it("respects MAX_REQUEST_BODY_BYTES env var", () => {
      vi.stubEnv("MAX_REQUEST_BODY_BYTES", "100");
      const res = callMiddleware("POST", "/api/v1/events", {
        headers: { "content-length": "200" },
      });
      expect(res.status).toBe(413);
    });

    it("does not check body size on GET requests", () => {
      const res = callMiddleware("GET", "/api/v1/events", {
        headers: { "content-length": "2000000" },
      });
      expect(res.status).toBe(200);
    });

    it("allows larger uploads on image upload routes", () => {
      // 3 MB — larger than default 1 MB but under upload limit of 5 MB
      const res = callMiddleware("POST", "/api/v1/events/test-event/image", {
        headers: { "content-length": "3000000" },
      });
      expect(res.status).toBe(200);
    });

    it("allows larger uploads on avatar upload routes", () => {
      const res = callMiddleware("POST", "/api/v1/account/apprentice-profile/avatar", {
        headers: { "content-length": "4000000" },
        cookies: "lms_session=abc123",
      });
      expect(res.status).toBe(200);
    });

    it("rejects uploads exceeding upload limit on image routes", () => {
      // 6 MB — exceeds 5 MB upload limit
      const res = callMiddleware("POST", "/api/v1/events/test-event/image", {
        headers: { "content-length": "6000000" },
      });
      expect(res.status).toBe(413);
    });
  });
});
