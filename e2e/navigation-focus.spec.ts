import { test, expect } from "@playwright/test";

test.describe("Navigation & Focus Management", () => {
  test("navigating between pages resets scroll position to top", async ({ page }) => {
    // 1. Go to home page
    await page.goto("/");
    
    // Scroll down to simulate user reading the page
    await page.evaluate(() => window.scrollTo(0, 500));
    let scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    // 2. Navigate to login page (since dashboard requires auth, let's test public routes first)
    await page.click('a:has-text("Login")');
    await page.waitForURL("**/login");
    
    // Wait for any potential scroll restoration to settle
    await page.waitForTimeout(500);
    
    // Assert scroll position is 0
    scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);

    // Scroll down on login page
    await page.evaluate(() => window.scrollTo(0, 300));
    
    // 3. Navigate to events page
    await page.click('a:has-text("Events")');
    await page.waitForURL("**/events");
    
    // Wait for any potential scroll restoration to settle
    await page.waitForTimeout(500);
    
    // Assert scroll position is 0
    scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);
  });
});
