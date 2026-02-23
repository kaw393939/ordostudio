import { expect, test, type Page } from "@playwright/test";

const FIXED_NOW_MS = Date.parse("2026-02-19T12:00:00.000Z");

const freezeTime = async (page: Page) => {
  await page.addInitScript((nowMs: number) => {
    const OriginalDate = Date;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    class MockDate extends (OriginalDate as any) {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(nowMs);
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        super(...(args as any));
      }

      static now() {
        return nowMs;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Date = MockDate;
  }, FIXED_NOW_MS);
};

const routes: Array<{ name: string; path: string; assert: (page: Page) => Promise<void> }> = [
  {
    name: "home",
    path: "/",
    assert: async (page) => {
      await expect(page.getByRole("heading", { name: "LMS 219 UI" })).toBeVisible();
    },
  },
  {
    name: "events-list",
    path: "/events",
    assert: async (page) => {
      await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
    },
  },
  {
    name: "event-detail",
    path: "/events/lighthouse-open",
    assert: async (page) => {
      await expect(
        page.getByRole("heading", { name: /Lighthouse Open Event|This event doesn’t exist|Page not found/i }),
      ).toBeVisible({ timeout: 15_000 });
    },
  },
  {
    name: "login",
    path: "/login",
    assert: async (page) => {
      await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
    },
  },
  {
    name: "register",
    path: "/register",
    assert: async (page) => {
      await expect(page.getByRole("heading", { name: "Register" })).toBeVisible();
    },
  },
  {
    name: "account",
    path: "/account",
    assert: async (page) => {
      await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
    },
  },
  {
    name: "admin-home",
    path: "/admin",
    assert: async (page) => {
      await expect(page.locator("body")).toContainText(/Admin|Login|Unauthorized|Forbidden/i);
    },
  },
  {
    name: "admin-events",
    path: "/admin/events",
    assert: async (page) => {
      await expect(page.locator("body")).toContainText(/Events|Login|Unauthorized|Forbidden/i);
    },
  },
];

test.describe("visual regression", () => {
  for (const route of routes) {
    test(route.name, async ({ page }) => {
      await freezeTime(page);

      await page.goto(route.path, { waitUntil: "networkidle" });
      await route.assert(page);

      await expect(page).toHaveScreenshot(`${route.name}.png`, {
        fullPage: true,
        animations: "disabled",
      });
    });
  }
});
