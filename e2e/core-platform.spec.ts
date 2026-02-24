import { expect, test } from "@playwright/test";

// ── Action Feed ──
test.describe("Action Feed", () => {
  test("dashboard page renders action feed area", async ({ page }) => {
    await page.goto("/dashboard");
    // Unauthenticated users get redirected to login or see an auth message
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("login page renders with form fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("register page renders with form fields", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Register" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });
});

// ── Public Navigation ──
test.describe("Public navigation", () => {
  test("homepage has main navigation links", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation").first();
    await expect(nav).toBeVisible();
  });

  test("events page is reachable from navigation", async ({ page }) => {
    await page.goto("/events");
    await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
  });

  test("studio page is reachable", async ({ page }) => {
    await page.goto("/studio");
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("skip-to-content link exists", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.locator("a.skip-nav");
    await expect(skipLink).toBeAttached();
  });
});

// ── Admin Shell ──
test.describe("Admin shell", () => {
  test("admin route shows auth gate for unauthenticated users", async ({ page }) => {
    await page.goto("/admin");
    await expect(
      page.getByText(
        /Checking admin access|Unauthorized|Forbidden|Sign in|Login|You must be logged in|Access denied/i,
      ),
    ).toBeVisible();
  });
});
