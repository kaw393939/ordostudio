import { test } from "@playwright/test";

const BASE = "http://localhost:3000";

test("events page screenshots", async ({ page }) => {
  // Desktop 1440
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "rendered_pages/screenshots/events-desktop-top.png", fullPage: false });
  await page.screenshot({ path: "rendered_pages/screenshots/events-desktop-full.png", fullPage: true });

  // Tablet 768
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "rendered_pages/screenshots/events-tablet-full.png", fullPage: true });

  // Mobile 375
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "rendered_pages/screenshots/events-mobile-full.png", fullPage: true });
});
