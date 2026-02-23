import { defineConfig } from "@playwright/test";

/**
 * Inflation suite config — runs against an existing dev server.
 * The server must already be running with seeded data:
 *   npm run seed:localhost && npm run dev -- -p 3000
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "inflate-realistic-data.spec.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 120_000, // individual tests may be slow (multiple registrations)
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    timezoneId: "America/New_York",
    locale: "en-US",
  },
  projects: [
    {
      name: "inflate",
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 }, colorScheme: "light" },
    },
  ],
  webServer: {
    command: "echo 'Using existing server'",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
