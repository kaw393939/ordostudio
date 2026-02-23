import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = async (relativePath: string): Promise<string> => {
  const absolutePath = join(process.cwd(), relativePath);
  return readFile(absolutePath, "utf8");
};

describe("e2e a11y/ui regression", () => {
  it("keeps route-level loading boundaries on key public/admin paths", () => {
    const requiredLoadingFiles = [
      "src/app/(public)/events/loading.tsx",
      "src/app/(public)/account/loading.tsx",
      "src/app/(admin)/admin/events/[slug]/loading.tsx",
      "src/app/(admin)/admin/events/[slug]/registrations/loading.tsx",
      "src/app/(admin)/admin/events/[slug]/export/loading.tsx",
    ];

    for (const filePath of requiredLoadingFiles) {
      expect(existsSync(join(process.cwd(), filePath))).toBe(true);
    }
  });

  it("preserves focus-visible affordances in shared primitives", async () => {
    const buttonSource = await readSource("src/components/primitives/button.tsx");
    const inputSource = await readSource("src/components/primitives/input.tsx");

    expect(buttonSource).toContain("focus-visible:ring-2");
    expect(buttonSource).toContain("focus-visible:ring-focus-ring");
    expect(inputSource).toContain("focus-visible:ring-2");
    expect(inputSource).toContain("focus-visible:ring-focus-ring");
  });

  it("keeps admin registration table semantic and keyboard friendly", async () => {
    const source = await readSource("src/app/(admin)/admin/events/[slug]/registrations/page.tsx");

    expect(source).toContain('aria-label="Event registrations table"');
    expect(source).toContain("<caption className=\"sr-only\"");
    expect(source).toContain("scope=\"col\"");
    expect(source).toContain("aria-label={`Select ${registration.user_email}`}");
  });

  it("keeps explicit cache-control for read-heavy events endpoints", async () => {
    const listSource = await readSource("src/app/api/v1/events/route.ts");
    const detailSource = await readSource("src/app/api/v1/events/[slug]/route.ts");

    expect(listSource).toContain("cache-control");
    expect(detailSource).toContain("cache-control");
    expect(listSource).toContain("stale-while-revalidate");
    expect(detailSource).toContain("stale-while-revalidate");
  });
});
