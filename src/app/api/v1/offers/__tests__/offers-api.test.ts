import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { GET as getOffers, POST as postOffers } from "../route";
import { DELETE as deleteOffer, GET as getOfferBySlug, PATCH as patchOffer } from "../[slug]/route";
import { POST as postOfferPackage } from "../[slug]/packages/route";
import { DELETE as deleteOfferPackage } from "../[slug]/packages/[packageId]/route";
import { POST as postLogin } from "../../auth/login/route";
import { POST as postRegister } from "../../auth/register/route";
import { runCli } from "../../../../../cli/run-cli";
import { CliIo } from "../../../../../cli/types";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-offers-test-"));
  tempDirs.push(directory);
  return join(directory, "app.db");
};

const createIo = (): { io: CliIo; stdout: string[]; stderr: string[] } => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    io: {
      writeStdout: (message: string) => {
        stdout.push(message);
      },
      writeStderr: (message: string) => {
        stderr.push(message);
      },
    },
    stdout,
    stderr,
  };
};

const runWithDb = async (argv: string[], dbPath: string): Promise<number> => {
  const { io } = createIo();
  const previousDbPath = process.env.APPCTL_DB_FILE;

  process.env.APPCTL_DB_FILE = dbPath;
  const exitCode = await runCli(argv, io);

  if (previousDbPath === undefined) {
    delete process.env.APPCTL_DB_FILE;
  } else {
    process.env.APPCTL_DB_FILE = previousDbPath;
  }

  return exitCode;
};

const setupBase = async (dbPath: string): Promise<void> => {
  await runWithDb(["db", "migrate"], dbPath);
  await runWithDb(["db", "seed"], dbPath);
};

const registerAndLoginAdmin = async (dbPath: string, email: string): Promise<string> => {
  await postRegister(
    new Request("http://localhost:3000/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email, password: "Password123!" }),
    }),
  );

  const db = new Database(dbPath);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
  const role = db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get() as { id: string };
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(user.id, role.id);
  db.close();

  const login = await postLogin(
    new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email, password: "Password123!" }),
    }),
  );

  return (login.headers.get("set-cookie") ?? "").split(";")[0];
};

afterEach(async () => {
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("api/v1 offers", () => {
  it("creates, lists, updates, and deletes offers with admin session", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLoginAdmin(dbPath, "offers-admin@example.com");

    const create = await postOffers(
      new Request("http://localhost:3000/api/v1/offers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "leadership-coaching",
          title: "Leadership Coaching",
          summary: "1:1 executive coaching engagement.",
          price_cents: 25000,
          currency: "USD",
          duration_label: "60 minutes",
          refund_policy_key: "standard",
          audience: "INDIVIDUAL",
          delivery_mode: "ONLINE",
          booking_url: "https://example.com/book/coaching",
          outcomes: ["Stronger communication", "Decision clarity"],
        }),
      }),
    );

    expect(create.status).toBe(201);
    const createdBody = await create.json();
    expect(createdBody.slug).toBe("leadership-coaching");

    const list = await getOffers(new Request("http://localhost:3000/api/v1/offers?audience=INDIVIDUAL&delivery_mode=ONLINE"));
    expect(list.status).toBe(200);
    const listBody = await list.json();
    expect(listBody.items).toHaveLength(1);

    const update = await patchOffer(
      new Request("http://localhost:3000/api/v1/offers/leadership-coaching", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ status: "INACTIVE" }),
      }),
      { params: Promise.resolve({ slug: "leadership-coaching" }) },
    );

    expect(update.status).toBe(200);
    const updatedBody = await update.json();
    expect(updatedBody.status).toBe("INACTIVE");

    const priceChangeWithoutConfirm = await patchOffer(
      new Request("http://localhost:3000/api/v1/offers/leadership-coaching", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ price_cents: 30000 }),
      }),
      { params: Promise.resolve({ slug: "leadership-coaching" }) },
    );

    expect(priceChangeWithoutConfirm.status).toBe(412);

    const priceChangeWithConfirm = await patchOffer(
      new Request("http://localhost:3000/api/v1/offers/leadership-coaching", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ price_cents: 30000, confirm_price_change: true }),
      }),
      { params: Promise.resolve({ slug: "leadership-coaching" }) },
    );

    expect(priceChangeWithConfirm.status).toBe(200);

    const deleteResponse = await deleteOffer(
      new Request("http://localhost:3000/api/v1/offers/leadership-coaching", {
        method: "DELETE",
        headers: {
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
      }),
      { params: Promise.resolve({ slug: "leadership-coaching" }) },
    );

    expect(deleteResponse.status).toBe(204);
  });

  it("supports package create/delete lifecycle", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLoginAdmin(dbPath, "packages-admin@example.com");

    await postOffers(
      new Request("http://localhost:3000/api/v1/offers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "team-bootcamp",
          title: "Team Bootcamp",
          summary: "Workshop-driven team acceleration.",
          price_cents: 150000,
          currency: "USD",
          duration_label: "Half day",
          refund_policy_key: "standard",
          audience: "GROUP",
          delivery_mode: "IN_PERSON",
          booking_url: "https://example.com/book/bootcamp",
        }),
      }),
    );

    const createPackage = await postOfferPackage(
      new Request("http://localhost:3000/api/v1/offers/team-bootcamp/packages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "Starter",
          scope: "Half-day workshop",
          price_label: "$2,500",
          sort_order: 10,
        }),
      }),
      { params: Promise.resolve({ slug: "team-bootcamp" }) },
    );

    expect(createPackage.status).toBe(201);
    const packageBody = await createPackage.json();
    expect(packageBody.name).toBe("Starter");

    const detail = await getOfferBySlug(
      new Request("http://localhost:3000/api/v1/offers/team-bootcamp"),
      { params: Promise.resolve({ slug: "team-bootcamp" }) },
    );
    const detailBody = await detail.json();
    expect(detailBody.packages).toHaveLength(1);

    const removePackage = await deleteOfferPackage(
      new Request(`http://localhost:3000/api/v1/offers/team-bootcamp/packages/${packageBody.id}`, {
        method: "DELETE",
        headers: {
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
      }),
      { params: Promise.resolve({ slug: "team-bootcamp", packageId: packageBody.id }) },
    );

    expect(removePackage.status).toBe(204);
  });

  it("rejects non-admin offer creation", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    await postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "user-offers@example.com", password: "Password123!" }),
      }),
    );

    const login = await postLogin(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "user-offers@example.com", password: "Password123!" }),
      }),
    );

    const userCookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

    const response = await postOffers(
      new Request("http://localhost:3000/api/v1/offers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: userCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "should-fail",
          title: "Should Fail",
          summary: "Should not create",
          price_cents: 9900,
          currency: "USD",
          duration_label: "30 minutes",
          refund_policy_key: "standard",
          audience: "BOTH",
          delivery_mode: "HYBRID",
          booking_url: "https://example.com/book/fail",
        }),
      }),
    );

    expect(response.status).toBe(403);
  });
});
