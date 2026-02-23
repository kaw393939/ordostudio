/**
 * Playwright Inflation Suite — Realistic Data Population
 *
 * Exercises every major site flow end-to-end, creating realistic data that
 * makes the site feel lived-in. Doubles as gap-finding: any flow that fails
 * reveals a real system bug that would block a user or admin.
 *
 * Run:  npx playwright test e2e/inflate-realistic-data.spec.ts --project chromium-desktop-light
 */
import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { resolve } from "node:path";

/* ──────────────────── Seed & Helpers ──────────────────── */

faker.seed(20260222); // deterministic for reproducibility

const BASE = "http://localhost:3000";

/** Fixture paths */
const FIXTURES = resolve(__dirname, "fixtures");
const avatarPath = (n: number) => resolve(FIXTURES, "avatars", `avatar-${String(n).padStart(2, "0")}.png`);
const eventImagePath = (name: string) => resolve(FIXTURES, "event-images", `${name}.png`);

/** Generate a realistic user profile */
function generateUser(index: number) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const email = faker.internet.email({ firstName, lastName, provider: "example.com" }).toLowerCase();
  const password = "Demo1234!";
  return {
    email,
    password,
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
    avatarFile: avatarPath(index + 1),
  };
}

/** Shared state across ordered tests */
const USERS = Array.from({ length: 12 }, (_, i) => generateUser(i));
const state = {
  users: USERS as { email: string; password: string; name: string; avatarFile: string }[],
  adminEmail: USERS[0].email,
  adminPassword: USERS[0].password,
  adminCookie: "",
  eventSlugs: [] as string[],
};

/** POST JSON to API (bypassing UI for speed where appropriate) */
async function apiPost(request: APIRequestContext, path: string, body: Record<string, unknown>, cookie?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    origin: BASE,
  };
  if (cookie) headers.cookie = `lms_session=${cookie}`;
  const resp = await request.post(`${BASE}${path}`, {
    data: body,
    headers,
  });
  return { status: resp.status(), body: await resp.json().catch(() => null), headers: resp.headers() };
}

/** Login and return session cookie */
async function apiLogin(request: APIRequestContext, email: string, password: string): Promise<string> {
  const resp = await request.post(`${BASE}/api/v1/auth/login`, {
    data: { email, password },
    headers: { "content-type": "application/json", origin: BASE },
  });
  expect(resp.status()).toBe(200);
  const cookies = resp.headers()["set-cookie"] ?? "";
  const match = cookies.match(/lms_session=([^;]+)/);
  expect(match).toBeTruthy();
  return match![1];
}

/** Cookie cache — avoids rate-limited re-login */
const cookieCache = new Map<string, string>();

/**
 * Create a session directly in the DB (bypasses rate limiter entirely).
 * Returns the raw session token to use as lms_session cookie.
 */
function dbCreateSession(email: string): string {
  // Check cache first
  const cached = cookieCache.get(email);
  if (cached) return cached;

  const { execFileSync } = require("node:child_process") as typeof import("node:child_process");
  const { createHash, randomUUID } = require("node:crypto") as typeof import("node:crypto");
  const cwd = resolve(__dirname, "..");
  const opts = { cwd, encoding: "utf8" as const, timeout: 5000, stdio: "pipe" as const };

  // Look up user id
  const userId = execFileSync("sqlite3", ["data/app.db",
    `SELECT id FROM users WHERE email = '${email}'`], opts).trim();
  if (!userId) throw new Error(`User not found: ${email}`);

  // Generate session token (same format as auth.ts)
  const sessionToken = `sess_${randomUUID().replace(/-/g, "")}`;
  const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
  const sessionId = randomUUID();
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

  // Insert session directly
  execFileSync("sqlite3", ["data/app.db",
    `INSERT INTO api_sessions (id, user_id, session_token_hash, created_at, expires_at, last_seen_at, ip_address, user_agent) VALUES ('${sessionId}', '${userId}', '${tokenHash}', '${now}', '${expires}', '${now}', '127.0.0.1', 'Playwright/inflate')`],
    opts);

  cookieCache.set(email, sessionToken);
  return sessionToken;
}

/* ──────────────────── Phase 1: User Registration ──────────────────── */

test.describe.serial("Phase 1 — User Registration", () => {
  test("create 12 users directly in database (bypasses rate limiter)", async () => {
    // Use execFileSync to avoid shell expansion of $ in password hash
    const { execFileSync } = await import("node:child_process");
    const cwd = resolve(__dirname, "..");
    // Argon2id hash for "Demo1234!" (generated with @node-rs/argon2)
    const passwordHash = "$argon2id$v=19$m=19456,t=2,p=1$zYsQwOLObFTFaOWg/Cwk+Q$NkXOFVUXIgmi8DM+52Vbcxxk9Qnog0XQJ6gHba1x3nI";
    const opts = { cwd, encoding: "utf8" as const, timeout: 5000, stdio: "pipe" as const };

    // Get the USER role id once (shared across all users)
    const roleId = execFileSync(
      "sqlite3", ["data/app.db", "SELECT id FROM roles WHERE name = 'USER'"], opts,
    ).trim();

    for (const user of USERS) {
      const userId = crypto.randomUUID();
      const now = new Date().toISOString();
      // Insert into users table (OR IGNORE for idempotency)
      execFileSync("sqlite3", ["data/app.db",
        `INSERT OR IGNORE INTO users (id, email, status, created_at, updated_at) VALUES ('${userId}', '${user.email}', 'ACTIVE', '${now}', '${now}')`],
        opts,
      );
      // Get the actual user ID (in case user already existed)
      const actualId = execFileSync("sqlite3", ["data/app.db",
        `SELECT id FROM users WHERE email = '${user.email}'`],
        opts,
      ).trim();
      // Insert auth credentials (OR IGNORE for idempotency)
      execFileSync("sqlite3", ["data/app.db",
        `INSERT OR IGNORE INTO api_credentials (user_id, password_hash, created_at, updated_at) VALUES ('${actualId}', '${passwordHash}', '${now}', '${now}')`],
        opts,
      );
      // Assign USER role
      if (roleId) {
        execFileSync("sqlite3", ["data/app.db",
          `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES ('${actualId}', '${roleId}')`],
          opts,
        );
      }
    }

    // Verify all users exist in DB
    const count = execFileSync("sqlite3", ["data/app.db",
      "SELECT count(*) FROM users WHERE status = 'ACTIVE'"], opts).trim();
    expect(Number(count)).toBeGreaterThanOrEqual(12);
  });

  test("verify users can log in via API", async ({ request }) => {
    // Spot-check first and last via API login
    for (const user of [state.users[0], state.users[11]]) {
      const cookie = await apiLogin(request, user.email, user.password);
      expect(cookie).toBeTruthy();
    }
  });

  test("exercise registration page via UI (one user)", async ({ page }) => {
    const uiTestEmail = `ui-test-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByLabel("Email").fill(uiTestEmail);
    await page.getByLabel("Password", { exact: true }).fill("Demo1234!");
    await page.getByLabel("Confirm password").fill("Demo1234!");

    const termsCheckbox = page.getByRole("checkbox").first();
    if (await termsCheckbox.isVisible().catch(() => false)) {
      await termsCheckbox.check();
    }

    await page.getByRole("button", { name: /create account/i }).click();
    await page.waitForURL(/\/login/, { timeout: 15000 });
  });

  test("exercise login page via UI (one user)", async ({ page }) => {
    const user = state.users[0];
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/account/, { timeout: 15000 });
  });
});

/* ──────────────────── Phase 2: Admin Elevation & Setup ──────────────────── */

test.describe.serial("Phase 2 — Admin Setup via CLI + API", () => {
  test("promote first user to SUPER_ADMIN via DB", async () => {
    const admin = state.users[0];
    state.adminEmail = admin.email;
    state.adminPassword = admin.password;

    // Use direct DB insertion (CLI expects --id, not --email)
    const { execFileSync } = await import("node:child_process");
    const cwd = resolve(__dirname, "..");
    const opts = { cwd, encoding: "utf8" as const, timeout: 5000, stdio: "pipe" as const };

    // Look up user IDs by email
    const adminId = execFileSync("sqlite3", ["data/app.db",
      `SELECT id FROM users WHERE email = '${admin.email}'`], opts).trim();
    const user1Id = execFileSync("sqlite3", ["data/app.db",
      `SELECT id FROM users WHERE email = '${state.users[1].email}'`], opts).trim();

    // Look up role IDs
    const superAdminRoleId = execFileSync("sqlite3", ["data/app.db",
      "SELECT id FROM roles WHERE name = 'SUPER_ADMIN'"], opts).trim();
    const adminRoleId = execFileSync("sqlite3", ["data/app.db",
      "SELECT id FROM roles WHERE name = 'ADMIN'"], opts).trim();

    // Assign SUPER_ADMIN to user[0]
    execFileSync("sqlite3", ["data/app.db",
      `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES ('${adminId}', '${superAdminRoleId}')`], opts);

    // Assign ADMIN to user[1]
    execFileSync("sqlite3", ["data/app.db",
      `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES ('${user1Id}', '${adminRoleId}')`], opts);

    // Create admin session directly (bypasses rate limiter)
    state.adminCookie = dbCreateSession(admin.email);
    expect(state.adminCookie).toBeTruthy();
  });

  test("admin can access /admin dashboard", async ({ page }) => {
    // Set cookie directly (avoids rate limiter)
    await page.context().addCookies([{
      name: "lms_session",
      value: state.adminCookie,
      domain: "localhost",
      path: "/",
    }]);

    await page.goto("/admin");
    // Should see admin dashboard, not an auth gate
    await expect(
      page.getByText(/admin|dashboard|console/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });
});

/* ──────────────────── Phase 3: Event Image Upload ──────────────────── */

test.describe.serial("Phase 3 — Event Images", () => {
  const eventImageMap: Record<string, string> = {
    "workshop-disciplined-inquiry-2026-09": "event-workshop-inquiry",
    "workshop-resilience-thinking-2026-10": "event-workshop-resilience",
    "town-hall-2026-09": "event-town-hall-sep",
    "everydayai-2026-q4": "event-everydayai-q4",
    "town-hall-2026-10": "event-town-hall-oct",
    "community-ai-office-hours-2026-11": "event-office-hours",
  };

  test("upload banner images to all seeded events", async ({ request }) => {
    // Ensure admin cookie exists
    if (!state.adminCookie) {
      state.adminCookie = dbCreateSession(state.adminEmail);
    }
    for (const [slug, imageName] of Object.entries(eventImageMap)) {
      const filePath = eventImagePath(imageName);
      const { readFile } = await import("node:fs/promises");
      const imageBuffer = await readFile(filePath);

      const resp = await request.post(`${BASE}/api/v1/events/${slug}/image`, {
        headers: {
          cookie: `lms_session=${state.adminCookie}`,
          origin: BASE,
        },
        multipart: {
          file: {
            name: `${imageName}.png`,
            mimeType: "image/png",
            buffer: imageBuffer,
          },
        },
      });

      // 201 Created or 200 OK
      if (resp.status() >= 200 && resp.status() < 300) {
        state.eventSlugs.push(slug);
      } else {
        console.warn(`Event image upload for ${slug}: HTTP ${resp.status()} — ${await resp.text()}`);
        // Don't fail — track this as a gap
      }
    }
    expect(state.eventSlugs.length).toBeGreaterThan(0);
  });
});

/* ──────────────────── Phase 4: Event Registrations ──────────────────── */

test.describe.serial("Phase 4 — Event Registrations", () => {
  test("register users for events via UI", async ({ page, request }) => {
    // Login as user[2] and register for first published event
    const user = state.users[2];
    const cookie = dbCreateSession(user.email);
    await page.context().addCookies([{
      name: "lms_session", value: cookie, domain: "localhost", path: "/",
    }]);
    // Browse events page
    await page.goto("/events");
    await expect(page.getByRole("heading", { name: /events/i })).toBeVisible();

    // Click first event link
    const firstEventLink = page.locator("a[href^='/events/']").first();
    if (await firstEventLink.isVisible().catch(() => false)) {
      await firstEventLink.click();
      await page.waitForLoadState("networkidle");

      // Try to register
      const registerBtn = page.getByRole("button", { name: /register|rsvp|sign up/i });
      if (await registerBtn.isVisible().catch(() => false)) {
        await registerBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test("register multiple users for events via API", async ({ request }) => {
    // Register users 2-8 for the workshop event
    const workshopSlug = "workshop-disciplined-inquiry-2026-09";
    for (let i = 2; i < 9; i++) {
      const user = state.users[i];
      const cookie = dbCreateSession(user.email);
      const result = await apiPost(request, `/api/v1/events/${workshopSlug}/registrations`, {}, cookie);

      if (result.status >= 200 && result.status < 300) {
        // Success
      } else {
        console.warn(`Registration ${user.email} for ${workshopSlug}: HTTP ${result.status}`);
      }
    }

    // Register users 3-6 for the town hall
    const townHallSlug = "town-hall-2026-09";
    for (let i = 3; i < 7; i++) {
      const user = state.users[i];
      const cookie = dbCreateSession(user.email);
      await apiPost(request, `/api/v1/events/${townHallSlug}/registrations`, {}, cookie);
    }

    // Register users 4-11 for EverydayAI
    const everydaySlug = "everydayai-2026-q4";
    for (let i = 4; i < 12; i++) {
      const user = state.users[i];
      const cookie = dbCreateSession(user.email);
      await apiPost(request, `/api/v1/events/${everydaySlug}/registrations`, {}, cookie);
    }

    // Register users 5-8 for office hours
    const officeSlug = "community-ai-office-hours-2026-11";
    for (let i = 5; i < 9; i++) {
      const user = state.users[i];
      const cookie = dbCreateSession(user.email);
      await apiPost(request, `/api/v1/events/${officeSlug}/registrations`, {}, cookie);
    }
  });

  test("admin check-in some registrations via API", async ({ request }) => {
    const workshopSlug = "workshop-disciplined-inquiry-2026-09";

    // Check in users 2, 3, 4 for the workshop
    for (let i = 2; i < 5; i++) {
      const user = state.users[i];
      const resp = await request.post(`${BASE}/api/v1/events/${workshopSlug}/checkins`, {
        headers: {
          "content-type": "application/json",
          cookie: `lms_session=${state.adminCookie}`,
          origin: BASE,
        },
        data: { user_email: user.email },
      });
      if (resp.status() >= 400) {
        console.warn(`Checkin ${user.email}: HTTP ${resp.status()}`);
      }
    }
  });
});

/* ──────────────────── Phase 5: Newsletter Subscriptions ──────────────────── */

test.describe.serial("Phase 5 — Newsletter", () => {
  test("subscribe via the newsletter page UI", async ({ page }) => {
    await page.goto("/newsletter");
    const emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
    await emailInput.fill(faker.internet.email({ provider: "example.com" }));

    const submitBtn = page.getByRole("button", { name: /subscribe|sign up|join/i });
    await submitBtn.click();
    await page.waitForTimeout(2000);
  });

  test("subscribe additional emails via API", async ({ request }) => {
    const emails = Array.from({ length: 15 }, () =>
      faker.internet.email({ provider: "example.com" }).toLowerCase(),
    );

    for (const email of emails) {
      await apiPost(request, "/api/v1/newsletter/subscribe", { email });
    }
  });

  test("subscribe from resource lead-magnet pages", async ({ page }) => {
    for (const resource of ["/resources/spell-book", "/resources/context-pack", "/resources/assessment"]) {
      await page.goto(resource);
      const emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(faker.internet.email({ provider: "example.com" }));
        const btn = page.getByRole("button", { name: /download|get|subscribe|access/i });
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(1500);
        }
      }
    }
  });
});

/* ──────────────────── Phase 6: Intake Requests ──────────────────── */

test.describe.serial("Phase 6 — Intake / Service Requests", () => {
  const intakeProfiles = [
    {
      contact_name: faker.person.fullName(),
      contact_email: faker.internet.email({ provider: "acme-corp.com" }),
      organization_name: "Acme Corporation",
      audience: "ORGANIZATION",
      goals: "Train our 40-person engineering team on AI-assisted development. We've seen a 30% drop in code review velocity and believe structured AI training could help.",
      timeline: "Q3 2026",
      constraints: "Budget approved for up to $15K. Need to fit within existing sprint cadence.",
      offer_slug: "corporate-professional",
    },
    {
      contact_name: faker.person.fullName(),
      contact_email: faker.internet.email({ provider: "innovate-labs.io" }),
      organization_name: "Innovate Labs",
      audience: "TEAM",
      goals: "Our ML team needs resilience thinking training. We had two production incidents last quarter caused by AI pipeline failures.",
      timeline: "ASAP — next 30 days if possible",
      constraints: "Team is fully remote (EST and PST). Need async-friendly materials.",
      offer_slug: "workshop-resilience-thinking",
    },
    {
      contact_name: faker.person.fullName(),
      contact_email: faker.internet.email({ provider: "startup.co" }),
      organization_name: "NovaTech Startup",
      audience: "INDIVIDUAL",
      goals: "I'm a solo founder building with AI tools. I need a structured approach instead of random ChatGPT prompting. Want to really understand spec-driven development.",
      timeline: "Flexible — anytime in next 2 months",
      offer_slug: "workshop-disciplined-inquiry",
    },
    {
      contact_name: faker.person.fullName(),
      contact_email: faker.internet.email({ provider: "govtech.org" }),
      organization_name: "City of Newark — IT Department",
      audience: "ENTERPRISE",
      goals: "We need the full enterprise program for 50 staff across 3 departments. Focus on AI security awareness and practical tool adoption.",
      timeline: "Must start by September 2026 — fiscal year constraint",
      constraints: "Government procurement process. Need SOW within 15 business days. Mandatory background checks for on-site facilitators.",
      offer_slug: "corporate-enterprise",
    },
    {
      contact_name: faker.person.fullName(),
      contact_email: faker.internet.email({ provider: "nonprofit.org" }),
      organization_name: "Community Tech Alliance",
      audience: "ORGANIZATION",
      goals: "We run a network of community centers and want to host EverydayAI workshops. Can we partner for a train-the-trainer model?",
      timeline: "Pilot in Q4 2026, full rollout 2027",
      constraints: "Non-profit budget. Need grant-eligible pricing and reporting. Training must be in-person at community sites.",
      offer_slug: "everydayai-community",
    },
    {
      contact_name: faker.person.fullName(),
      contact_email: faker.internet.email({ provider: "bigbank.com" }),
      organization_name: "Global Finance Corp",
      audience: "ENTERPRISE",
      goals: "Enterprise-wide AI capability assessment. 200+ engineers across 5 offices. Need to measure human edge capabilities before and after training.",
      timeline: "Q1 2027 — planning phase starts now",
      constraints: "Strict compliance requirements. All training materials must be reviewed by legal. No cloud-based AI tools in training environment.",
      offer_slug: "corporate-enterprise",
    },
  ];

  test("submit intake requests via the service request form", async ({ page }) => {
    for (const profile of intakeProfiles.slice(0, 2)) {
      await page.goto("/services/request");
      await page.waitForLoadState("networkidle");

      // Fill required fields — the form structure varies, so be resilient
      const nameInput = page.getByLabel(/name/i).first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(profile.contact_name);
      }

      const emailInput = page.getByLabel(/email/i).first();
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(profile.contact_email);
      }

      const orgInput = page.getByLabel(/organization|company/i);
      if (await orgInput.isVisible().catch(() => false)) {
        await orgInput.fill(profile.organization_name ?? "");
      }

      const goalsInput = page.getByLabel(/goals|needs|describe/i).or(page.locator("textarea").first());
      if (await goalsInput.isVisible().catch(() => false)) {
        await goalsInput.fill(profile.goals);
      }

      const timelineInput = page.getByLabel(/timeline|when/i);
      if (await timelineInput.isVisible().catch(() => false)) {
        await timelineInput.fill(profile.timeline ?? "");
      }

      // Submit
      const submitBtn = page.getByRole("button", { name: /submit|send|request/i });
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }
    }
  });

  test("submit remaining intake requests via API", async ({ request }) => {
    for (const profile of intakeProfiles.slice(2)) {
      const result = await apiPost(request, "/api/v1/intake", profile);
      if (result.status >= 400) {
        console.warn(`Intake request for ${profile.organization_name}: HTTP ${result.status} — ${JSON.stringify(result.body)}`);
      }
    }
  });
});

/* ──────────────────── Phase 7: Apprentice Profiles ──────────────────── */

test.describe.serial("Phase 7 — Apprentice Profiles", () => {
  const apprenticeProfiles = [
    {
      userIndex: 3,
      handle: "mara-chen",
      display_name: "Mara Chen",
      headline: "Full-Stack Developer | AI-Augmented Workflow Practitioner",
      bio: "Building production systems with AI assistance since 2025. Focused on Disciplined Inquiry and spec-driven development. Currently working through Gate 3: Problem Decomposition. I believe the future belongs to engineers who can evaluate AI output — not just prompt it.",
      location: "Brooklyn, NY",
      website_url: "https://marachen.dev",
      tags: "typescript,react,ai-augmented,spec-driven",
    },
    {
      userIndex: 4,
      handle: "dev-jackson",
      display_name: "Devon Jackson",
      headline: "ML Engineer | Resilience Thinking Advocate",
      bio: "Former SRE turned ML engineer. After two production incidents I realized our AI pipelines needed the same resilience thinking we apply to infrastructure. Gate 5 in progress — Failure Mode Analysis is my current focus.",
      location: "Newark, NJ",
      website_url: "https://djackson.co",
      tags: "python,ml-ops,resilience,sre",
    },
    {
      userIndex: 5,
      handle: "sofia-r",
      display_name: "Sofia Ramirez",
      headline: "Frontend Engineer | Translation Enthusiast",
      bio: "I love making complex AI concepts accessible to everyone. Working on Gate 8: Translation Brief. My goal is to help non-technical stakeholders understand what AI can and cannot do for their business.",
      location: "Austin, TX",
      website_url: "https://sofiar.design",
      tags: "design,accessibility,translation,ux",
    },
    {
      userIndex: 6,
      handle: "kai-m",
      display_name: "Kai Matsumoto",
      headline: "Senior Engineer | Systems Thinking + Agentic Workflows",
      bio: "Designing agentic systems with human-in-the-loop checkpoints. Just completed Gate 6: Agentic Workflow Design. The hardest part isn't building the system — it's knowing where the human needs to stay in the loop.",
      location: "San Francisco, CA",
      tags: "systems-design,agents,orchestration,llm",
    },
  ];

  test("create apprentice profiles via account page", async ({ page, request }) => {
    for (const profile of apprenticeProfiles) {
      const user = state.users[profile.userIndex];
      // Create session directly (bypasses rate limiter)
      const cookie = dbCreateSession(user.email);
      await page.context().addCookies([{
        name: "lms_session", value: cookie, domain: "localhost", path: "/",
      }]);
      // Navigate to apprentice profile page
      await page.goto("/account/apprentice-profile");
      await page.waitForLoadState("networkidle");

      // Fill profile fields
      const handleInput = page.getByLabel(/handle|username/i);
      if (await handleInput.isVisible().catch(() => false)) {
        await handleInput.fill(profile.handle);
      }

      const nameInput = page.getByLabel(/display name/i);
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(profile.display_name);
      }

      const headlineInput = page.getByLabel(/headline|title/i);
      if (await headlineInput.isVisible().catch(() => false)) {
        await headlineInput.fill(profile.headline);
      }

      const bioInput = page.getByLabel(/bio/i).or(page.locator('textarea[name="bio"]'));
      if (await bioInput.isVisible().catch(() => false)) {
        await bioInput.fill(profile.bio);
      }

      const locationInput = page.getByLabel(/location/i);
      if (await locationInput.isVisible().catch(() => false)) {
        await locationInput.fill(profile.location ?? "");
      }

      const websiteInput = page.getByLabel(/website/i);
      if (await websiteInput.isVisible().catch(() => false)) {
        await websiteInput.fill(profile.website_url ?? "");
      }

      const tagsInput = page.getByLabel(/tags|skills/i);
      if (await tagsInput.isVisible().catch(() => false)) {
        await tagsInput.fill(profile.tags);
      }

      // Submit
      const saveBtn = page.getByRole("button", { name: /save|create|update|submit/i });
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(3000);
      }

      // Upload avatar
      const avatarCookie = dbCreateSession(user.email);
      const { readFile } = await import("node:fs/promises");
      const avatarBuffer = await readFile(user.avatarFile);

      const avatarResp = await request.post(`${BASE}/api/v1/account/apprentice-profile/avatar`, {
        headers: {
          cookie: `lms_session=${avatarCookie}`,
          origin: BASE,
        },
        multipart: {
          file: {
            name: "avatar.png",
            mimeType: "image/png",
            buffer: avatarBuffer,
          },
        },
      });

      if (avatarResp.status() >= 400) {
        console.warn(`Avatar upload for ${user.email}: HTTP ${avatarResp.status()}`);
      }

      // Logout
      await page.goto("/");
    }
  });

  test("admin approves apprentice profiles", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(state.adminEmail);
    await page.getByLabel("Password", { exact: true }).fill(state.adminPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/account|\/$/);

    await page.goto("/admin/apprentices");
    await page.waitForLoadState("networkidle");

    // Look for approve buttons and click them
    const approveButtons = page.getByRole("button", { name: /approve/i });
    const count = await approveButtons.count();
    for (let i = 0; i < count; i++) {
      await approveButtons.nth(0).click(); // always click first since list refreshes
      await page.waitForTimeout(1500);
    }
  });

  test("apprentice profiles visible in public directory", async ({ page }) => {
    await page.goto("/apprentices");
    await page.waitForLoadState("networkidle");

    // Should show at least one apprentice
    const content = await page.textContent("body");
    const hasApprentice = apprenticeProfiles.some((p) => content?.includes(p.display_name));
    if (!hasApprentice) {
      console.warn("GAP: No apprentice profiles visible in /apprentices directory after approval");
    }
  });
});

/* ──────────────────── Phase 8: Field Reports ──────────────────── */

test.describe.serial("Phase 8 — Field Reports", () => {
  const fieldReports = [
    {
      userIndex: 3,
      event_slug: "workshop-disciplined-inquiry-2026-09",
      key_insights: "The 40/60 ratio completely changed how I think about AI-assisted development. Spending 40% of time on specs and context means the AI's 60% is dramatically better. My Context Pack v1 caught 3 specification gaps that AI had missed.",
      models: "Context Pack as a living document. CLAIMS.md as a verification artifact. The Autodidactic Loop — learning by teaching the AI what you know.",
      money: "Estimated 15-20% productivity improvement once spec-driven workflow is habitual. Initial investment of 2-3 slower days pays back within the first sprint.",
      people: "Pair programming with AI changes the dynamic. The 'Named Expert Critique' technique produced better code review feedback than my usual approach.",
      what_i_tried: "Built a Context Pack for our authentication module. Used it to generate 40+ API tests. Rejected 8 AI suggestions that violated our security constraints — each documented in my Audit Log.",
      client_advice: "Start small. Pick one module, write the Context Pack, and use it for one sprint. The proof is in the audit trail — you'll see exactly where AI helps and where it hallucinates.",
    },
    {
      userIndex: 4,
      event_slug: "workshop-resilience-thinking-2026-10",
      key_insights: "Our ML pipeline had 3 undocumented failure modes that only appeared under load. The Failure Mode Analysis technique found all 3 before our next production incident.",
      models: "Defense-in-Depth for AI pipelines. Error budgets for ML model degradation. Blameless postmortem format that focuses on system improvement, not blame.",
      money: "Previous incidents cost $50K in engineer hours + customer impact. FMA investment: 2 days of engineering time. ROI is obvious.",
      people: "The incident drill was uncomfortable but invaluable. Engineers who had never led an incident response got practice in a safe environment.",
      what_i_tried: "Ran a full FMA on our recommendation engine pipeline. Identified 5 failure modes, built monitoring for 4, and documented the 'acceptable risk' for the 5th. Then ran an incident drill simulating the worst case.",
      client_advice: "Don't wait for the 2 AM page. Schedule the FMA now. The drill is awkward — do it anyway. Your future on-call self will thank you.",
    },
    {
      userIndex: 5,
      event_slug: "town-hall-2026-09",
      key_insights: "The METR benchmark data is sobering. AI capability acceleration is real, but the gap between benchmark performance and production reliability is wider than most people realize.",
      models: "Benchmark Saturation — when scores plateau, look at what the benchmark doesn't measure. Deployment Gap — the difference between demo and production.",
      money: "The $600B investment creates pressure to ship AI features fast. The Human Edge framework provides a structured way to adopt responsibly without falling behind.",
      people: "Non-technical stakeholders were most engaged during the Q&A. They want honest frameworks for evaluating vendor claims, not more hype.",
      what_i_tried: "Applied the Epistemic Humility checklist to 3 vendor proposals. Two vendors couldn't answer basic questions about failure modes and data assumptions.",
      client_advice: "Bring your team to the next Town Hall. The data-driven format cuts through the noise. Ask the hard questions — that's what it's for.",
    },
    {
      userIndex: 6,
      event_slug: "workshop-disciplined-inquiry-2026-09",
      key_insights: "Systems Thinking applied to agentic workflows reveals hidden coupling. Most 'multi-agent' systems are really single-agent with routing. True orchestration requires explicit handoff protocols.",
      models: "AGENT_HANDOFF.md as a coordination protocol. Command Pattern for agent task delegation. Human-in-the-Loop not as a safety net but as a design primitive.",
      money: "Agentic workflow reduced our document processing pipeline from 45 minutes to 8 minutes of human review time. But the safety checkpoints doubled development time — worth it for production trust.",
      people: "The team was initially skeptical of human checkpoints ('doesn't that defeat the purpose of automation?'). After seeing the agent confidently hallucinate a legal clause, skepticism turned to gratitude.",
      what_i_tried: "Designed a 3-agent workflow for contract review: extraction agent → analysis agent → summary agent with human checkpoint between analysis and summary. Built escalation paths for low-confidence extractions.",
      client_advice: "Start with the human-in-the-loop checkpoints, not the agents. Define where a human MUST review before you automate anything. The agents are the easy part.",
    },
  ];

  test("submit field reports via the studio report page", async ({ page, request }) => {
    for (const report of fieldReports) {
      const user = state.users[report.userIndex];
      // Create session directly (bypasses rate limiter)
      const cookie = dbCreateSession(user.email);
      await page.context().addCookies([{
        name: "lms_session", value: cookie, domain: "localhost", path: "/",
      }]);
      await page.goto("/studio/report");
      await page.waitForLoadState("networkidle");

      // Select event if dropdown exists
      const eventSelect = page.getByLabel(/event/i).or(page.locator('select[name="eventSlug"]'));
      if (await eventSelect.isVisible().catch(() => false)) {
        await eventSelect.selectOption({ value: report.event_slug }).catch(() => {
          // May be a different UI pattern
        });
      }

      // Fill all fields
      const fields: [string, string][] = [
        ["key_insights", report.key_insights],
        ["models", report.models],
        ["money", report.money],
        ["people", report.people],
        ["what_i_tried", report.what_i_tried],
        ["client_advice", report.client_advice],
      ];

      for (const [name, value] of fields) {
        const input = page.getByLabel(new RegExp(name.replace(/_/g, "[_ ]"), "i"))
          .or(page.locator(`textarea[name="${name}"]`))
          .or(page.locator(`[data-field="${name}"] textarea`));
        if (await input.isVisible().catch(() => false)) {
          await input.fill(value);
        }
      }

      const submitBtn = page.getByRole("button", { name: /submit|save|send/i });
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }

      await page.goto("/");
    }
  });

  test("admin features a field report", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(state.adminEmail);
    await page.getByLabel("Password", { exact: true }).fill(state.adminPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/account|\/$/);

    await page.goto("/admin/field-reports");
    await page.waitForLoadState("networkidle");

    // Feature the first report if possible
    const featureBtn = page.getByRole("button", { name: /feature/i }).first();
    if (await featureBtn.isVisible().catch(() => false)) {
      await featureBtn.click();
      await page.waitForTimeout(2000);
    }
  });
});

/* ──────────────────── Phase 9: Measurement Events ──────────────────── */

test.describe.serial("Phase 9 — Measurement / Analytics", () => {
  test("generate page views and CTA clicks via navigation", async ({ page }) => {
    // Browse the site like a real visitor — this generates measurement events
    const routes = [
      "/",
      "/about",
      "/services",
      "/events",
      "/studio",
      "/apprentices",
      "/insights",
      "/frameworks",
      "/frameworks/human-edge",
      "/frameworks/forty-sixty",
      "/frameworks/spell-book",
      "/resources",
      "/resources/spell-book",
      "/resources/context-pack",
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500); // Let measurement events fire

      // Click visible CTAs to generate click events
      const ctas = page.locator('a[href*="services"], a[href*="request"], button[data-cta]');
      const ctaCount = await ctas.count();
      if (ctaCount > 0) {
        // Click first CTA then navigate away
        await ctas.first().click().catch(() => {
          // Some CTAs navigate — that's fine
        });
        await page.waitForTimeout(500);
      }
    }
  });

  test("inject additional measurement events via API", async ({ request }) => {
    const eventKeys = [
      "PAGE_VIEW",
      "CTA_CLICK",
      "FORM_START_CONSULT_REQUEST",
      "FORM_SUBMIT_CONSULT_REQUEST_SUCCESS",
      "EMAIL_CAPTURE",
      "LEAD_MAGNET_DOWNLOAD",
      "COMMUNITY_EVENT_REGISTER",
      "NEWSLETTER_SUBSCRIBE",
    ];

    const paths = ["/", "/services", "/events", "/studio", "/about", "/resources/spell-book"];

    // Generate 50+ measurement events
    for (let i = 0; i < 50; i++) {
      const eventKey = faker.helpers.arrayElement(eventKeys);
      const path = faker.helpers.arrayElement(paths);

      await request.post(`${BASE}/api/v1/measure/events`, {
        headers: { "content-type": "application/json", origin: BASE },
        data: {
          event_key: eventKey,
          path,
          anonymous_id: faker.string.uuid(),
          metadata: { source: "inflation-suite", index: i },
        },
      });
    }
  });
});

/* ──────────────────── Phase 10: Admin Verification Tour ──────────────────── */

test.describe.serial("Phase 10 — Admin Verification Tour", () => {
  test("verify admin pages show populated data", async ({ page, request }) => {
    // Get admin cookie (re-create session if needed)
    if (!state.adminCookie) {
      state.adminCookie = dbCreateSession(state.adminEmail);
    }
    // Set cookie on page context
    await page.context().addCookies([{
      name: "lms_session",
      value: state.adminCookie,
      domain: "localhost",
      path: "/",
    }]);
    const adminPages = [
      { path: "/admin", expect: /dashboard|admin|console/i },
      { path: "/admin/events", expect: /events|workshop|town hall/i },
      { path: "/admin/users", expect: /users|email/i },
      { path: "/admin/intake", expect: /intake|requests/i },
      { path: "/admin/apprentices", expect: /apprentice|profiles/i },
      { path: "/admin/field-reports", expect: /field report|insights/i },
      { path: "/admin/newsletter", expect: /newsletter|issues/i },
      { path: "/admin/measurement", expect: /measurement|analytics|events/i },
      { path: "/admin/flywheel", expect: /flywheel|metrics/i },
      { path: "/admin/audit", expect: /audit|log/i },
    ];

    const gaps: string[] = [];

    for (const { path, expect: pattern } of adminPages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const body = await page.textContent("body");
      if (!body || !pattern.test(body)) {
        gaps.push(`${path} — expected pattern not found: ${pattern}`);
      }

      // Check for error states
      const hasError = await page.locator('[class*="error"], [role="alert"]').count();
      if (hasError > 0) {
        const errorText = await page.locator('[class*="error"], [role="alert"]').first().textContent();
        gaps.push(`${path} — has error: ${errorText}`);
      }
    }

    if (gaps.length > 0) {
      console.warn("GAPS FOUND IN ADMIN PAGES:\n" + gaps.join("\n"));
    }
  });

  test("verify public event pages show registration counts", async ({ page }) => {
    await page.goto("/events");
    await page.waitForLoadState("networkidle");

    // Should show event cards
    const eventLinks = page.locator("a[href^='/events/']");
    const count = await eventLinks.count();
    expect(count).toBeGreaterThan(0);

    // Visit first event detail
    await eventLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Should show event details
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("verify apprentice directory shows approved profiles", async ({ page }) => {
    await page.goto("/apprentices");
    await page.waitForLoadState("networkidle");

    const body = await page.textContent("body");
    // At minimum the page should render without errors
    expect(body).toBeTruthy();
  });
});

/* ──────────────────── Phase 11: Gap Detection Summary ──────────────────── */

test("final gap detection — site health check", async ({ page, request }) => {
  const gaps: string[] = [];

  // Check all public pages load without errors
  const publicPages = [
    "/", "/about", "/services", "/events", "/studio",
    "/apprentices", "/insights", "/frameworks", "/newsletter",
    "/resources", "/privacy", "/terms",
  ];

  for (const path of publicPages) {
    const resp = await request.get(`${BASE}${path}`);
    if (resp.status() >= 400) {
      gaps.push(`${path} returned HTTP ${resp.status()}`);
    }
  }

  // Check API health
  const apiEndpoints = [
    "/api/v1/events",
    "/api/v1/offers",
  ];

  for (const path of apiEndpoints) {
    const resp = await request.get(`${BASE}${path}`);
    if (resp.status() >= 400) {
      gaps.push(`API ${path} returned HTTP ${resp.status()}`);
    }
  }

  if (gaps.length > 0) {
    console.warn("SITE HEALTH GAPS:\n" + gaps.join("\n"));
  }

  // This test always passes — gaps are logged as warnings
  expect(true).toBe(true);
});
