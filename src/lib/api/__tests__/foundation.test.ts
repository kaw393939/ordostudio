import { describe, expect, it } from "vitest";

import { GET as getApiRoot } from "../../../app/api/v1/route";
import { GET as getApiDocs } from "../../../app/api/v1/docs/route";
import { hal, mediaTypes, problem } from "../response";

describe("API foundation response builders", () => {
  it("returns HAL payload with links and content type", async () => {
    const response = hal(
      { service: "test" },
      {
        self: { href: "/api/v1" },
      },
      { requestId: "req-hal-1" },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(mediaTypes.hal);
    expect(response.headers.get("x-request-id")).toBe("req-hal-1");
    expect(body).toEqual({
      service: "test",
      _links: {
        self: { href: "/api/v1" },
      },
    });
  });

  it("returns RFC 9457 problem payload with request correlation", async () => {
    const request = new Request("http://localhost:3000/api/v1/events");
    const response = problem(
      {
        type: "https://example.com/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Missing or invalid credentials",
      },
      request,
      { requestId: "req-problem-1" },
    );

    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain(mediaTypes.problem);
    expect(response.headers.get("x-request-id")).toBe("req-problem-1");
    expect(body).toMatchObject({
      type: "https://example.com/problems/unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Missing or invalid credentials",
      instance: "http://localhost:3000/api/v1/events",
      request_id: "req-problem-1",
    });
  });
});

describe("API foundation routes", () => {
  it("serves /api/v1 as HAL discoverability root", async () => {
    const response = await getApiRoot();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(mediaTypes.hal);
    expect(body._links).toMatchObject({
      self: { href: "/api/v1" },
      docs: { href: "/api/v1/docs" },
      auth_register: { href: "/api/v1/auth/register" },
      auth_login: { href: "/api/v1/auth/login" },
      me: { href: "/api/v1/me" },
      events: { href: "/api/v1/events" },
    });
  });

  it("serves /api/v1/docs as OpenAPI 3.1 JSON", async () => {
    const response = await getApiDocs();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body).toMatchObject({
      openapi: "3.1.0",
      info: {
        title: "LMS 219 API",
      },
    });
    expect(body.paths).toHaveProperty("/api/v1");
    expect(body.paths).toHaveProperty("/api/v1/docs");
  });
});
