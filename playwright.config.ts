import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  reporter: [["list"], ["html", { open: "never" }]],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    timezoneId: "UTC",
    locale: "en-US",
    contextOptions: {
      reducedMotion: "reduce",
    },
  },
  projects: [
    {
      name: "chromium-mobile-light",
      use: { browserName: "chromium", viewport: { width: 375, height: 812 }, colorScheme: "light" },
    },
    {
      name: "chromium-mobile-dark",
      use: { browserName: "chromium", viewport: { width: 375, height: 812 }, colorScheme: "dark" },
    },
    {
      name: "chromium-tablet-light",
      use: { browserName: "chromium", viewport: { width: 768, height: 1024 }, colorScheme: "light" },
    },
    {
      name: "chromium-tablet-dark",
      use: { browserName: "chromium", viewport: { width: 768, height: 1024 }, colorScheme: "dark" },
    },
    {
      name: "chromium-desktop-light",
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 }, colorScheme: "light" },
    },
    {
      name: "chromium-desktop-dark",
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 }, colorScheme: "dark" },
    },
  ],
  webServer: {
    command: "npm run seed:localhost && npm run dev -- -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: false,
  },
});
