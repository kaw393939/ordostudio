import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { POST as postRegister } from "../../auth/register/route";
import { POST as postLogin } from "../../auth/login/route";
import { POST as postEvents } from "../../events/route";
import { POST as postIntake } from "../../intake/route";
import { GET as getCommercial } from "../route";
import { GET as getProposals, POST as postProposal } from "../proposals/route";
import { PATCH as patchProposal } from "../proposals/[id]/route";
import { GET as getInvoices, POST as postInvoice } from "../invoices/route";
import { PATCH as patchInvoice } from "../invoices/[id]/route";
import { POST as postPayment } from "../invoices/[id]/payments/route";
import { runCli } from "../../../../../cli/run-cli";
import { CliIo } from "../../../../../cli/types";
import { resetRateLimits } from "../../../../../lib/api/rate-limit";

const tempDirs: string[] = [];

const createDbPath = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "appctl-api-commercial-test-"));
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

const registerAndLogin = async (email: string): Promise<string> => {
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

const addAdminRole = (dbPath: string, email: string) => {
  const db = new Database(dbPath);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string };
  const role = db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get() as { id: string };
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)").run(user.id, role.id);
  db.close();
};

afterEach(async () => {
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
  resetRateLimits();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("api/v1 commercial", () => {
  it("tracks proposal lifecycle from draft to accepted", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("commercial-admin@example.com");
    addAdminRole(dbPath, "commercial-admin@example.com");

    const eventCreate = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "commercial-event",
          title: "Commercial Event",
          start: "2026-08-01T10:00:00.000Z",
          end: "2026-08-01T11:00:00.000Z",
          timezone: "UTC",
        }),
      }),
    );
    expect(eventCreate.status).toBe(201);

    const intakeCreate = await postIntake(
      new Request("http://localhost:3000/api/v1/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          audience: "INDIVIDUAL",
          contact_name: "Jordan Client",
          contact_email: "jordan.client@example.com",
          goals: "Need coaching plan",
        }),
      }),
    );
    expect(intakeCreate.status).toBe(201);
    const intakeBody = await intakeCreate.json();

    const createProposal = await postProposal(
      new Request("http://localhost:3000/api/v1/commercial/proposals", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          intake_request_id: intakeBody.id,
          event_slug: "commercial-event",
          offer_slug: "coaching-offer",
          client_email: "jordan.client@example.com",
          title: "Coaching Proposal",
          amount_cents: 150000,
          currency: "USD",
        }),
      }),
    );

    expect(createProposal.status).toBe(201);
    const proposal = await createProposal.json();
    expect(proposal.status).toBe("DRAFT");

    const sent = await patchProposal(
      new Request(`http://localhost:3000/api/v1/commercial/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ status: "SENT" }),
      }),
      { params: Promise.resolve({ id: proposal.id }) },
    );
    expect(sent.status).toBe(200);

    const accepted = await patchProposal(
      new Request(`http://localhost:3000/api/v1/commercial/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ status: "ACCEPTED" }),
      }),
      { params: Promise.resolve({ id: proposal.id }) },
    );
    expect(accepted.status).toBe(200);
    expect((await accepted.json()).status).toBe("ACCEPTED");

    const invalidBack = await patchProposal(
      new Request(`http://localhost:3000/api/v1/commercial/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ status: "DRAFT" }),
      }),
      { params: Promise.resolve({ id: proposal.id }) },
    );
    expect(invalidBack.status).toBe(400);

    const proposalList = await getProposals(
      new Request("http://localhost:3000/api/v1/commercial/proposals?client_email=jordan.client@example.com", {
        headers: { cookie: adminCookie },
      }),
    );
    expect(proposalList.status).toBe(200);
    expect((await proposalList.json()).count).toBe(1);
  });

  it("tracks invoice and payment status transitions", async () => {
    const dbPath = await createDbPath();
    await setupBase(dbPath);
    process.env.APPCTL_DB_FILE = dbPath;
    process.env.APPCTL_ENV = "local";

    const adminCookie = await registerAndLogin("billing-admin@example.com");
    addAdminRole(dbPath, "billing-admin@example.com");

    const proposalCreate = await postProposal(
      new Request("http://localhost:3000/api/v1/commercial/proposals", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          client_email: "billing.client@example.com",
          title: "Billing Proposal",
          amount_cents: 200000,
          currency: "USD",
        }),
      }),
    );

    // needs linked artifact, so this should fail
    expect(proposalCreate.status).toBe(400);

    const eventCreate = await postEvents(
      new Request("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          slug: "billing-event",
          title: "Billing Event",
          start: "2026-08-05T10:00:00.000Z",
          end: "2026-08-05T11:00:00.000Z",
          timezone: "UTC",
        }),
      }),
    );
    expect(eventCreate.status).toBe(201);

    const validProposalCreate = await postProposal(
      new Request("http://localhost:3000/api/v1/commercial/proposals", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          event_slug: "billing-event",
          offer_slug: "billing-offer",
          client_email: "billing.client@example.com",
          title: "Billing Proposal",
          amount_cents: 200000,
          currency: "USD",
        }),
      }),
    );
    expect(validProposalCreate.status).toBe(201);
    const proposal = await validProposalCreate.json();

    await patchProposal(
      new Request(`http://localhost:3000/api/v1/commercial/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ status: "SENT" }),
      }),
      { params: Promise.resolve({ id: proposal.id }) },
    );

    await patchProposal(
      new Request(`http://localhost:3000/api/v1/commercial/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ status: "ACCEPTED" }),
      }),
      { params: Promise.resolve({ id: proposal.id }) },
    );

    const createInvoice = await postInvoice(
      new Request("http://localhost:3000/api/v1/commercial/invoices", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          proposal_id: proposal.id,
          due_at: "2026-08-20T00:00:00.000Z",
        }),
      }),
    );

    expect(createInvoice.status).toBe(201);
    const invoice = await createInvoice.json();
    expect(invoice.status).toBe("DRAFT");

    const issued = await patchInvoice(
      new Request(`http://localhost:3000/api/v1/commercial/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ status: "ISSUED" }),
      }),
      { params: Promise.resolve({ id: invoice.id }) },
    );
    expect(issued.status).toBe(200);

    const partialPayment = await postPayment(
      new Request(`http://localhost:3000/api/v1/commercial/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ amount_cents: 50000, currency: "USD", reference: "wire-1" }),
      }),
      { params: Promise.resolve({ id: invoice.id }) },
    );

    expect(partialPayment.status).toBe(201);
    const partialBody = await partialPayment.json();
    expect(partialBody.invoice.status).toBe("PARTIALLY_PAID");

    const finalPayment = await postPayment(
      new Request(`http://localhost:3000/api/v1/commercial/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ amount_cents: 150000, currency: "USD", reference: "wire-2" }),
      }),
      { params: Promise.resolve({ id: invoice.id }) },
    );

    expect(finalPayment.status).toBe(201);
    const finalBody = await finalPayment.json();
    expect(finalBody.invoice.status).toBe("PAID");

    const list = await getInvoices(
      new Request("http://localhost:3000/api/v1/commercial/invoices?status=PAID", {
        headers: { cookie: adminCookie },
      }),
    );
    expect(list.status).toBe(200);
    expect((await list.json()).count).toBe(1);

    const overview = await getCommercial(new Request("http://localhost:3000/api/v1/commercial", { headers: { cookie: adminCookie } }));
    expect(overview.status).toBe(200);
    const overviewBody = await overview.json();
    expect(overviewBody.overview.invoice_count).toBeGreaterThanOrEqual(1);
    expect(overviewBody.overview.payment_count).toBeGreaterThanOrEqual(2);
  });
});
