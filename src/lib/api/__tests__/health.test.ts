import { describe, it, expect } from "vitest";
import { GET as getHealth } from "../../../app/api/v1/health/route";

describe("health endpoint", () => {
  it("returns 200 with status ok", async () => {
    const response = await getHealth(
      new Request("http://localhost:3000/api/v1/health"),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  it("includes uptime as a number", async () => {
    const response = await getHealth(
      new Request("http://localhost:3000/api/v1/health"),
      { params: Promise.resolve({}) },
    );

    const body = await response.json();
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it("includes an ISO timestamp", async () => {
    const response = await getHealth(
      new Request("http://localhost:3000/api/v1/health"),
      { params: Promise.resolve({}) },
    );

    const body = await response.json();
    expect(body.timestamp).toBeTruthy();
    // Verify it parses as a valid date
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it("requires no authentication", async () => {
    // No session cookie — should still return 200
    const response = await getHealth(
      new Request("http://localhost:3000/api/v1/health"),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(200);
  });
});
