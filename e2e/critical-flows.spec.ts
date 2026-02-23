import { expect, test } from "@playwright/test";

test("critical public auth and event browse flow", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Register" })).toBeVisible();

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();

  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
});

test("critical admin routes are reachable behind auth gate", async ({ page }) => {
  await page.goto("/admin");
  await expect(
    page.getByText(
      /Checking admin access|Unauthorized|Forbidden|Sign in|Login|You must be logged in|Access denied/i,
    ),
  ).toBeVisible();
});
