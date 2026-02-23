import { spawnSync } from "node:child_process";

const runCli = (args, { allowFailure = false } = {}) => {
  const result = spawnSync("npm", ["run", "cli", "--", "--env", "local", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.status !== 0 && !allowFailure) {
    throw new Error(`CLI command failed: ${args.join(" ")}\n${result.stderr}`);
  }

  return result;
};

const runStep = (label, action) => {
  process.stdout.write(`\n[seed] ${label}\n`);
  action();
};

const safeWrite = (args) => {
  const result = runCli(args, { allowFailure: true });
  if (result.status !== 0) {
    const combined = `${result.stdout}\n${result.stderr}`;
    const expected = /already exists|already published|already cancelled|conflict/i.test(combined);
    if (!expected) {
      throw new Error(`CLI write command failed: ${args.join(" ")}\n${combined}`);
    }
  }
};

runStep("Applying migrations", () => runCli(["db", "migrate"]));
runStep("Applying baseline seed", () => runCli(["db", "seed"]));
runStep("Applying Studio Ordo fixture", () => safeWrite(["db", "seed", "--fixture", "studio-ordo"]));

runStep("Creating local showcase users", () => {
  safeWrite(["user", "create", "--email", "lighthouse-admin@example.com", "--status", "ACTIVE"]);
  safeWrite(["user", "create", "--email", "lighthouse-user@example.com", "--status", "ACTIVE"]);
  safeWrite(["user", "create", "--email", "lighthouse-user2@example.com", "--status", "ACTIVE"]);
});

runStep("Creating local showcase events", () => {
  safeWrite([
    "event",
    "create",
    "--slug",
    "lighthouse-open",
    "--title",
    "Lighthouse Open Event",
    "--start",
    "2026-08-12T10:00:00Z",
    "--end",
    "2026-08-12T11:00:00Z",
    "--tz",
    "UTC",
    "--capacity",
    "30",
  ]);
  safeWrite(["event", "publish", "--slug", "lighthouse-open"]);

  safeWrite([
    "event",
    "create",
    "--slug",
    "lighthouse-full",
    "--title",
    "Lighthouse Full Event",
    "--start",
    "2026-08-14T10:00:00Z",
    "--end",
    "2026-08-14T11:00:00Z",
    "--tz",
    "UTC",
    "--capacity",
    "1",
  ]);
  safeWrite(["event", "publish", "--slug", "lighthouse-full"]);

  safeWrite([
    "event",
    "create",
    "--slug",
    "lighthouse-cancelled",
    "--title",
    "Lighthouse Cancelled Event",
    "--start",
    "2026-08-16T10:00:00Z",
    "--end",
    "2026-08-16T11:00:00Z",
    "--tz",
    "UTC",
    "--capacity",
    "25",
  ]);
  safeWrite(["event", "publish", "--slug", "lighthouse-cancelled"]);
  safeWrite(["event", "cancel", "--slug", "lighthouse-cancelled", "--reason", "Operational simulation"]);
});

runStep("Creating local showcase registrations", () => {
  safeWrite(["reg", "add", "--event", "lighthouse-open", "--user", "lighthouse-user@example.com"]);
  safeWrite(["reg", "add", "--event", "lighthouse-full", "--user", "lighthouse-user@example.com"]);
  safeWrite(["reg", "add", "--event", "lighthouse-full", "--user", "lighthouse-user2@example.com"]);
  safeWrite(["checkin", "--event", "lighthouse-open", "--user", "lighthouse-user@example.com"]);
});

process.stdout.write("\n[seed] Localhost content population complete.\n");
