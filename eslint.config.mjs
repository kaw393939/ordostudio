import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // ── Architecture Boundary Rules ────────────────────────────────────
  // Enforce the Clean Architecture dependency rule:
  //   core/ must not import from delivery (cli/, lib/, app/) or adapters/
  //   platform/ must not import from delivery (cli/, lib/, app/)
  //   adapters/ must not import from delivery (cli/, lib/, app/)
  {
    files: ["src/core/**/*.ts", "src/core/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/cli/*", "*/cli/*"], message: "core/ must not import from delivery (cli/)." },
            { group: ["@/lib/*", "*/lib/*"], message: "core/ must not import from delivery (lib/)." },
            { group: ["@/app/*", "*/app/*"], message: "core/ must not import from delivery (app/)." },
            { group: ["@/components/*", "*/components/*"], message: "core/ must not import from delivery (components/)." },
            { group: ["@/adapters/*", "*/adapters/*"], message: "core/ must not import from adapters/." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/platform/**/*.ts", "src/platform/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/cli/*", "*/cli/*"], message: "platform/ must not import from delivery (cli/)." },
            { group: ["@/lib/*", "*/lib/*"], message: "platform/ must not import from delivery (lib/)." },
            { group: ["@/app/*", "*/app/*"], message: "platform/ must not import from delivery (app/)." },
            { group: ["@/components/*", "*/components/*"], message: "platform/ must not import from delivery (components/)." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/adapters/**/*.ts", "src/adapters/**/*.tsx"],
    ignores: ["src/adapters/**/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/cli/*", "*/cli/*"], message: "adapters/ must not import from delivery (cli/)." },
            { group: ["@/lib/*", "*/lib/*"], message: "adapters/ must not import from delivery (lib/)." },
            { group: ["@/app/*", "*/app/*"], message: "adapters/ must not import from delivery (app/)." },
            { group: ["@/components/*", "*/components/*"], message: "adapters/ must not import from delivery (components/)." },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
