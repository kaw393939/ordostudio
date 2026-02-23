/**
 * Next.js Proxy — Security Headers, CORS, Route Guards
 *
 * Runs on every request to:
 * 1. Set security headers (HSTS, CSP, X-Frame-Options, etc.)
 * 2. Handle CORS preflight and response headers for /api/*
 * 3. Enforce session cookie presence on /admin and /account routes
 * 4. Reject oversized request bodies
 *
 * Migrated from middleware.ts → proxy.ts (Next.js 16 convention).
 */

import { NextResponse, type NextRequest } from "next/server";

/* ── Security Headers ──────────────────────────────── */

const SECURITY_HEADERS: Record<string, string> = {
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "x-dns-prefetch-control": "off",
};

function buildCsp(isDev: boolean): string {
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.postmarkapp.com https://api.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/* ── CORS ──────────────────────────────────────────── */

function getAllowedOrigins(): Set<string> {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return new Set(
    raw
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  );
}

function corsHeaders(
  origin: string | null,
  allowedOrigins: Set<string>,
): Record<string, string> {
  if (!origin) return {};

  // Same-origin requests: browser won't send Origin for same-origin navigations,
  // but fetch APIs may include it. If allowedOrigins is empty, allow same-origin.
  if (allowedOrigins.size === 0 || allowedOrigins.has(origin)) {
    return {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      "access-control-allow-headers":
        "Content-Type, Authorization, X-Requested-With",
      "access-control-allow-credentials": "true",
      "access-control-max-age": "86400",
    };
  }

  return {};
}

/* ── Route Guards ──────────────────────────────────── */

const PROTECTED_PREFIXES = ["/admin", "/account"];
const PROTECTED_API_PREFIXES = ["/api/v1/admin", "/api/v1/account"];

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isProtectedApi(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/* ── Body Size ─────────────────────────────────────── */

const DEFAULT_MAX_BODY_BYTES = 1_048_576; // 1 MB
const UPLOAD_MAX_BODY_BYTES = 5_242_880; // 5 MB — matches upload-validation.ts

/** Routes that accept file uploads get a larger body limit. */
const UPLOAD_PATH_PATTERNS = [
  /^\/api\/v1\/events\/[^/]+\/image$/,
  /^\/api\/v1\/account\/apprentice-profile\/avatar$/,
  /^\/api\/v1\/account\/field-reports\/attachments$/,
];

function getMaxBodyBytes(pathname: string): number {
  // Check per-route override first
  if (UPLOAD_PATH_PATTERNS.some((p) => p.test(pathname))) {
    return UPLOAD_MAX_BODY_BYTES;
  }
  const raw = process.env.MAX_REQUEST_BODY_BYTES;
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_MAX_BODY_BYTES;
}

/* ── Proxy Entry ──────────────────────────────────── */

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === "development";
  const isApi = pathname.startsWith("/api/");
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();

  // --- CORS preflight ---
  if (isApi && request.method === "OPTIONS") {
    const cors = corsHeaders(origin, allowedOrigins);
    const preflightResponse = new NextResponse(null, { status: 204 });
    for (const [key, value] of Object.entries(cors)) {
      preflightResponse.headers.set(key, value);
    }
    // Still set security headers on preflight
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      preflightResponse.headers.set(key, value);
    }
    return preflightResponse;
  }

  // --- Body size limit (mutation methods only) ---
  if (["POST", "PATCH", "PUT"].includes(request.method)) {
    const contentLength = parseInt(
      request.headers.get("content-length") ?? "0",
      10,
    );
    if (contentLength > getMaxBodyBytes(pathname)) {
      const tooLargeResponse = NextResponse.json(
        {
          type: "https://lms-219.dev/problems/payload-too-large",
          title: "Payload Too Large",
          status: 413,
          detail: "Request body exceeds maximum allowed size.",
        },
        { status: 413 },
      );
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        tooLargeResponse.headers.set(key, value);
      }
      return tooLargeResponse;
    }
  }

  // --- Route guards (defense-in-depth) ---
  const hasSession = request.cookies.has("lms_session");

  if (!hasSession && isProtectedApi(pathname)) {
    const unauthorizedResponse = NextResponse.json(
      {
        type: "https://lms-219.dev/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Active session required.",
      },
      { status: 401 },
    );
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      unauthorizedResponse.headers.set(key, value);
    }
    return unauthorizedResponse;
  }

  if (!hasSession && isProtectedPage(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      redirectResponse.headers.set(key, value);
    }
    return redirectResponse;
  }

  // --- Default: continue with security headers ---
  const response = NextResponse.next();

  // Security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // CSP
  response.headers.set("content-security-policy", buildCsp(isDev));

  // CORS (on API responses)
  if (isApi && origin) {
    const cors = corsHeaders(origin, allowedOrigins);
    for (const [key, value] of Object.entries(cors)) {
      response.headers.set(key, value);
    }
  }

  return response;
}

/* ── Matcher: skip static files and Next.js internals ─ */

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
