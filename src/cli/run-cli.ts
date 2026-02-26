import { randomUUID } from "node:crypto";
import { Command, CommanderError, Option } from "commander";
import {
  authTokenCreate,
  authTokenRevoke,
  userCreate,
  userDisable,
  userEnable,
  userList,
  userRoleAdd,
  userRoleRemove,
  userShow,
} from "./auth-users";
import { loadConfigFromDisk, resolveConfig } from "./config";
import { dbBackup, dbMigrate, dbRestore, dbSeed, dbStatus, doctor } from "./db";
import { eventCancel, eventCreate, eventList, eventPublish, eventUpdate } from "./events";
import { CliError } from "./errors";
import { newsletterDispatchDue } from "./newsletter";
import {
  jobsStats,
  jobsProcessOnce,
  jobsProcessPoll,
  jobsRetryDead,
  jobsPurgeCompleted,
} from "./jobs";
import { eventExport, regAdd, regCheckin, regList, regRemove } from "./registrations";
import { createLogger } from "../platform/logger";
import { CliIo, ExitCode, GlobalOptions, JsonEnvelope, RuntimeEnv } from "./types";

const logger = createLogger({ name: "cli" });

const defaultIo: CliIo = {
  writeStdout: (message: string) => {
    process.stdout.write(message);
  },
  writeStderr: (message: string) => {
    process.stderr.write(message);
  },
};

const usageErrorCodes = new Set([
  "commander.invalidArgument",
  "commander.unknownOption",
  "commander.unknownCommand",
  "commander.excessArguments",
  "commander.missingMandatoryOptionValue",
  "commander.optionMissingArgument",
]);

const isUsageError = (error: CommanderError): boolean => usageErrorCodes.has(error.code);

export const mapErrorToExitCode = (error: unknown): ExitCode => {
  if (error instanceof CliError) {
    return error.exitCode;
  }

  if (error instanceof CommanderError) {
    if (error.code === "commander.helpDisplayed") {
      return 0;
    }
    if (isUsageError(error)) {
      return 2;
    }
  }

  return 1;
};

const writeJsonEnvelope = (io: CliIo, envelope: JsonEnvelope): void => {
  io.writeStdout(`${JSON.stringify(envelope)}\n`);
};

const writeDoctorText = (io: CliIo, env: RuntimeEnv): void => {
  io.writeStdout(`doctor ok (env=${env})\n`);
};

const writeText = (io: CliIo, message: string): void => {
  io.writeStdout(`${message}\n`);
};

const normalizeOptions = (raw: Record<string, unknown>): GlobalOptions => ({
  env: raw.env as RuntimeEnv | undefined,
  json: Boolean(raw.json),
  quiet: Boolean(raw.quiet),
  color: Boolean(raw.color),
  trace: Boolean(raw.trace),
  dryRun: Boolean(raw.dryRun),
  yes: Boolean(raw.yes),
  token: typeof raw.token === "string" ? raw.token : undefined,
});

const createProgram = (io: CliIo): Command => {
  const program = new Command();

  program
    .name("appctl")
    .description("Super Admin Control Plane CLI")
    .option("--json", "emit strict JSON output")
    .option("--quiet", "reduce human-readable output")
    .option("--no-color", "disable ANSI colors")
    .option("--trace", "show stack traces for errors")
    .option("--dry-run", "validate request without mutating state")
    .option("--yes", "skip interactive confirmations")
    .option("--token <token>", "super-admin service token override")
    .showHelpAfterError()
    .exitOverride();

  program.addOption(
    new Option("--env <env>", "runtime environment").choices(["local", "staging", "prod"]),
  );

  program.configureOutput({
    writeOut: io.writeStdout,
    writeErr: io.writeStderr,
  });

  const resolveRuntimeConfig = async (): Promise<ReturnType<typeof resolveConfig>> => {
    const options = normalizeOptions(program.opts<Record<string, unknown>>());
    const fileConfig = await loadConfigFromDisk();
    return resolveConfig({ fileConfig, flags: options });
  };

  const outputResult = (
    commandName: string,
    env: RuntimeEnv,
    data: unknown,
    textSummary: string,
    outputAsJson: boolean,
  ): void => {
    if (outputAsJson) {
      const envelope: JsonEnvelope = {
        ok: true,
        command: commandName,
        env,
        data,
        warnings: [],
        errors: [],
        request_id: randomUUID(),
      };
      writeJsonEnvelope(io, envelope);
      return;
    }

    writeText(io, textSummary);
  };

  const newsletterCommand = program.command("newsletter").description("Newsletter lifecycle commands");

  newsletterCommand
    .command("dispatch-due")
    .description("Dispatch due scheduled newsletter sends")
    .action(async () => {
      const config = await resolveRuntimeConfig();
      const result = await newsletterDispatchDue(config);

      outputResult(
        "newsletter.dispatch-due",
        config.env,
        result,
        `newsletter dispatch-due: dispatched=${result.dispatched}`,
        config.output.defaultFormat === "json",
      );
    });

  program
    .command("doctor")
    .description("Validate config and runtime prerequisites")
    .action(async () => {
      const config = await resolveRuntimeConfig();
      const result = doctor(config);

      logger.debug({ command: "doctor" }, "doctor command executed");

      if (config.output.defaultFormat === "json") {
        outputResult(
          "doctor",
          config.env,
          {
            status: "ok",
            config: {
              env: config.env,
              db: config.db,
            },
            checks: result,
          },
          "doctor ok",
          true,
        );
        return;
      }

      writeDoctorText(io, config.env);
    });

  const dbCommand = program.command("db").description("Database lifecycle commands");

  dbCommand
    .command("status")
    .description("Show current migration status")
    .action(async () => {
      const config = await resolveRuntimeConfig();
      const status = dbStatus(config);

      outputResult(
        "db.status",
        config.env,
        status,
        `db status: applied=${status.appliedCount}, pending=${status.pendingCount}`,
        config.output.defaultFormat === "json",
      );
    });

  dbCommand
    .command("migrate")
    .description("Apply pending migrations")
    .action(async () => {
      const config = await resolveRuntimeConfig();
      const result = dbMigrate(config, randomUUID());

      outputResult(
        "db.migrate",
        config.env,
        result,
        `db migrate: applied=${result.applied.length}`,
        config.output.defaultFormat === "json",
      );
    });

  dbCommand
    .command("seed")
    .description("Seed baseline data")
    .option("--fixture <name>", "optional fixture name")
    .action(async (args: { fixture?: string }) => {
      const config = await resolveRuntimeConfig();
      const result = dbSeed(config, randomUUID(), args.fixture);

      const parts = [`roles=${result.seededRoles}`];
      if (result.seededOffers) parts.push(`offers=${result.seededOffers}`);
      if (result.seededEvents) parts.push(`events=${result.seededEvents}`);
      if (result.seededNewsletter) parts.push(`newsletter=${result.seededNewsletter}`);

      outputResult(
        "db.seed",
        config.env,
        result,
        `db seed: ${parts.join(", ")}`,
        config.output.defaultFormat === "json",
      );
    });

  dbCommand
    .command("backup")
    .description("Create a consistent DB backup artifact")
    .requiredOption("--out <file>", "backup output file")
    .option("--force-prod", "allow dangerous operation in prod")
    .action(async (args: { out: string; forceProd?: boolean }) => {
      const config = await resolveRuntimeConfig();
      const options = normalizeOptions(program.opts<Record<string, unknown>>());
      const result = await dbBackup(config, randomUUID(), args.out, {
        forceProd: Boolean(args.forceProd),
        yes: options.yes,
        token: options.token,
      });

      outputResult(
        "db.backup",
        config.env,
        result,
        `db backup: out=${result.out}`,
        config.output.defaultFormat === "json",
      );
    });

  dbCommand
    .command("restore")
    .description("Restore DB from backup artifact")
    .requiredOption("--from <file>", "backup file to restore from")
    .option("--force-prod", "allow dangerous operation in prod")
    .action(async (args: { from: string; forceProd?: boolean }) => {
      const config = await resolveRuntimeConfig();
      const options = normalizeOptions(program.opts<Record<string, unknown>>());
      const result = await dbRestore(config, randomUUID(), args.from, {
        forceProd: Boolean(args.forceProd),
        yes: options.yes,
        token: options.token,
      });

      outputResult(
        "db.restore",
        config.env,
        result,
        `db restore: from=${result.from} target=${result.target}`,
        config.output.defaultFormat === "json",
      );
    });

  const authCommand = program.command("auth").description("Authentication and service tokens");
  const authTokenCommand = authCommand.command("token").description("Service token commands");

  authTokenCommand
    .command("create")
    .description("Create a service token")
    .requiredOption("--name <label>", "token label")
    .option("--ttl-days <n>", "optional token ttl in days")
    .action(async (args: { name: string; ttlDays?: string }) => {
      const config = await resolveRuntimeConfig();
      const ttlDays = args.ttlDays ? Number(args.ttlDays) : undefined;

      const result = authTokenCreate(config, randomUUID(), args.name, ttlDays);

      outputResult(
        "auth.token.create",
        config.env,
        result,
        `token created: id=${result.id} token=${result.token}`,
        config.output.defaultFormat === "json",
      );
    });

  authTokenCommand
    .command("revoke")
    .description("Revoke a service token")
    .requiredOption("--id <tokenId>", "token id")
    .action(async (args: { id: string }) => {
      const config = await resolveRuntimeConfig();
      const result = authTokenRevoke(config, randomUUID(), args.id);

      outputResult(
        "auth.token.revoke",
        config.env,
        result,
        `token revoked: id=${result.id}`,
        config.output.defaultFormat === "json",
      );
    });

  const userCommand = program.command("user").description("User management commands");

  userCommand
    .command("create")
    .description("Create a user")
    .requiredOption("--email <email>", "user email")
    .option("--status <status>", "PENDING|ACTIVE|DISABLED")
    .action(async (args: { email: string; status?: string }) => {
      const config = await resolveRuntimeConfig();
      const options = normalizeOptions(program.opts<Record<string, unknown>>());
      const result = userCreate(config, randomUUID(), args.email, args.status, options.token);

      outputResult(
        "user.create",
        config.env,
        result,
        `user created: id=${result.id} email=${result.email} status=${result.status}`,
        config.output.defaultFormat === "json",
      );
    });

  userCommand
    .command("list")
    .description("List users")
    .option("--role <role>", "filter by role")
    .option("--status <status>", "filter by status")
    .option("--search <q>", "filter by email search")
    .action(async (args: { role?: string; status?: string; search?: string }) => {
      const config = await resolveRuntimeConfig();
      const users = userList(config, {
        role: args.role,
        status: args.status,
        search: args.search,
      });

      outputResult(
        "user.list",
        config.env,
        users,
        `users: count=${users.length}`,
        config.output.defaultFormat === "json",
      );
    });

  userCommand
    .command("show")
    .description("Show a user by id or email")
    .option("--id <id>", "user id")
    .option("--email <email>", "user email")
    .action(async (args: { id?: string; email?: string }) => {
      const config = await resolveRuntimeConfig();
      const result = userShow(config, {
        id: args.id,
        email: args.email,
      });

      outputResult(
        "user.show",
        config.env,
        result,
        `user: id=${result.id} email=${result.email} status=${result.status}`,
        config.output.defaultFormat === "json",
      );
    });

  userCommand
    .command("disable")
    .description("Disable a user")
    .requiredOption("--id <id>", "user id")
    .option("--reason <text>", "optional reason")
    .action(async (args: { id: string; reason?: string }) => {
      const config = await resolveRuntimeConfig();
      const options = normalizeOptions(program.opts<Record<string, unknown>>());
      const result = userDisable(config, randomUUID(), args.id, options.token, args.reason);

      outputResult(
        "user.disable",
        config.env,
        result,
        `user disabled: id=${result.id}`,
        config.output.defaultFormat === "json",
      );
    });

  userCommand
    .command("enable")
    .description("Enable a user")
    .requiredOption("--id <id>", "user id")
    .action(async (args: { id: string }) => {
      const config = await resolveRuntimeConfig();
      const options = normalizeOptions(program.opts<Record<string, unknown>>());
      const result = userEnable(config, randomUUID(), args.id, options.token);

      outputResult(
        "user.enable",
        config.env,
        result,
        `user enabled: id=${result.id}`,
        config.output.defaultFormat === "json",
      );
    });

  const roleCommand = userCommand.command("role").description("User role operations");

  roleCommand
    .command("add")
    .description("Add role to user")
    .requiredOption("--id <id>", "user id")
    .requiredOption("--role <role>", "role name")
    .action(async (args: { id: string; role: string }) => {
      const config = await resolveRuntimeConfig();
      const options = normalizeOptions(program.opts<Record<string, unknown>>());
      const result = userRoleAdd(config, randomUUID(), args.id, args.role, options.token);

      outputResult(
        "user.role.add",
        config.env,
        result,
        `role added: user=${result.userId} role=${result.role}`,
        config.output.defaultFormat === "json",
      );
    });

  roleCommand
    .command("remove")
    .description("Remove role from user")
    .requiredOption("--id <id>", "user id")
    .requiredOption("--role <role>", "role name")
    .action(async (args: { id: string; role: string }) => {
      const config = await resolveRuntimeConfig();
      const options = normalizeOptions(program.opts<Record<string, unknown>>());
      const result = userRoleRemove(config, randomUUID(), args.id, args.role, options.token);

      outputResult(
        "user.role.remove",
        config.env,
        result,
        `role removed: user=${result.userId} role=${result.role}`,
        config.output.defaultFormat === "json",
      );
    });

  const eventCommand = program.command("event").description("Event lifecycle commands");

  eventCommand
    .command("create")
    .description("Create an event in DRAFT status")
    .requiredOption("--slug <slug>", "event slug")
    .requiredOption("--title <title>", "event title")
    .requiredOption("--start <iso>", "start datetime ISO")
    .requiredOption("--end <iso>", "end datetime ISO")
    .requiredOption("--tz <iana>", "IANA timezone")
    .option("--capacity <n>", "optional capacity")
    .action(
      async (args: {
        slug: string;
        title: string;
        start: string;
        end: string;
        tz: string;
        capacity?: string;
      }) => {
        const config = await resolveRuntimeConfig();
        const options = normalizeOptions(program.opts<Record<string, unknown>>());
        const capacity = args.capacity === undefined ? undefined : Number(args.capacity);
        const result = eventCreate(
          config,
          randomUUID(),
          {
            slug: args.slug,
            title: args.title,
            start: args.start,
            end: args.end,
            timezone: args.tz,
            capacity,
          },
          options.token,
        );

        outputResult(
          "event.create",
          config.env,
          result,
          `event created: slug=${result.slug} status=${result.status}`,
          config.output.defaultFormat === "json",
        );
      },
    );

  eventCommand
    .command("update")
    .description("Update mutable event fields")
    .requiredOption("--slug <slug>", "event slug")
    .option("--title <title>", "new title")
    .option("--start <iso>", "new start datetime ISO")
    .option("--end <iso>", "new end datetime ISO")
    .option("--capacity <n>", "new capacity")
    .action(
      async (args: { slug: string; title?: string; start?: string; end?: string; capacity?: string }) => {
        const config = await resolveRuntimeConfig();
        const options = normalizeOptions(program.opts<Record<string, unknown>>());
        const result = eventUpdate(
          config,
          randomUUID(),
          args.slug,
          {
            title: args.title,
            start: args.start,
            end: args.end,
            capacity: args.capacity === undefined ? undefined : Number(args.capacity),
          },
          options.token,
        );

        outputResult(
          "event.update",
          config.env,
          result,
          `event updated: slug=${result.slug}`,
          config.output.defaultFormat === "json",
        );
      },
    );

  eventCommand
    .command("publish")
    .description("Publish an event")
    .requiredOption("--slug <slug>", "event slug")
    .action(async (args: { slug: string }) => {
      const config = await resolveRuntimeConfig();
      const options = normalizeOptions(program.opts<Record<string, unknown>>());
      const result = eventPublish(config, randomUUID(), args.slug, options.token);

      outputResult(
        "event.publish",
        config.env,
        result,
        `event published: slug=${result.slug} status=${result.status}`,
        config.output.defaultFormat === "json",
      );
    });

  eventCommand
    .command("cancel")
    .description("Cancel an event")
    .requiredOption("--slug <slug>", "event slug")
    .requiredOption("--reason <text>", "cancel reason")
    .action(async (args: { slug: string; reason: string }) => {
      const config = await resolveRuntimeConfig();
      const options = normalizeOptions(program.opts<Record<string, unknown>>());
      const result = eventCancel(config, randomUUID(), args.slug, args.reason, options.token);

      outputResult(
        "event.cancel",
        config.env,
        result,
        `event cancelled: slug=${result.slug} status=${result.status}`,
        config.output.defaultFormat === "json",
      );
    });

  eventCommand
    .command("list")
    .description("List events")
    .option("--status <status>", "filter by status")
    .option("--from <iso>", "start lower bound")
    .option("--to <iso>", "start upper bound")
    .action(async (args: { status?: string; from?: string; to?: string }) => {
      const config = await resolveRuntimeConfig();
      const result = eventList(config, {
        status: args.status,
        from: args.from,
        to: args.to,
      });

      outputResult(
        "event.list",
        config.env,
        result,
        `events: count=${result.length}`,
        config.output.defaultFormat === "json",
      );
    });

  eventCommand
    .command("export")
    .description("Export registrations for an event")
    .requiredOption("--slug <slug>", "event slug")
    .requiredOption("--format <format>", "csv|json")
    .requiredOption("--out <file>", "output file path")
    .option("--include-email", "include user email in export")
    .action(async (args: { slug: string; format: string; out: string; includeEmail?: boolean }) => {
      const config = await resolveRuntimeConfig();
      const options = normalizeOptions(program.opts<Record<string, unknown>>());
      const format = args.format.toLowerCase();
      if (format !== "csv" && format !== "json") {
        throw new CliError("Invalid format. Allowed: csv, json.", 2);
      }

      const result = eventExport(
        config,
        randomUUID(),
        {
          slug: args.slug,
          format,
          out: args.out,
          includeEmail: Boolean(args.includeEmail),
        },
        options.token,
      );

      outputResult(
        "event.export",
        config.env,
        result,
        `event export: slug=${result.slug} format=${result.format} count=${result.count} out=${result.out}`,
        config.output.defaultFormat === "json",
      );
    });

  const regCommand = program.command("reg").description("Event registration commands");

  regCommand
    .command("add")
    .description("Add registration for event/user")
    .requiredOption("--event <slug>", "event slug")
    .requiredOption("--user <emailOrId>", "user email or id")
    .action(async (args: { event: string; user: string }) => {
      const config = await resolveRuntimeConfig();
      const options = normalizeOptions(program.opts<Record<string, unknown>>());
      const result = regAdd(config, randomUUID(), args.event, args.user, options.token);

      outputResult(
        "reg.add",
        config.env,
        result,
        `registration added: event=${args.event} user=${args.user} status=${result.status}`,
        config.output.defaultFormat === "json",
      );
    });

  regCommand
    .command("remove")
    .description("Cancel registration for event/user")
    .requiredOption("--event <slug>", "event slug")
    .requiredOption("--user <emailOrId>", "user email or id")
    .option("--reason <text>", "optional reason")
    .action(async (args: { event: string; user: string; reason?: string }) => {
      const config = await resolveRuntimeConfig();
      const options = normalizeOptions(program.opts<Record<string, unknown>>());
      const result = regRemove(config, randomUUID(), args.event, args.user, options.token, args.reason);

      outputResult(
        "reg.remove",
        config.env,
        result,
        `registration cancelled: event=${args.event} user=${args.user} status=${result.status}`,
        config.output.defaultFormat === "json",
      );
    });

  regCommand
    .command("list")
    .description("List registrations for an event")
    .requiredOption("--event <slug>", "event slug")
    .option("--status <status>", "registration status filter")
    .action(async (args: { event: string; status?: string }) => {
      const config = await resolveRuntimeConfig();
      const result = regList(config, args.event, args.status);

      outputResult(
        "reg.list",
        config.env,
        result,
        `registrations: event=${args.event} count=${result.length}`,
        config.output.defaultFormat === "json",
      );
    });

  program
    .command("checkin")
    .description("Check in a registered user")
    .requiredOption("--event <slug>", "event slug")
    .requiredOption("--user <emailOrId>", "user email or id")
    .action(async (args: { event: string; user: string }) => {
      const config = await resolveRuntimeConfig();
      const options = normalizeOptions(program.opts<Record<string, unknown>>());
      const result = regCheckin(config, randomUUID(), args.event, args.user, options.token);

      outputResult(
        "registration.checkin",
        config.env,
        result,
        `checkin complete: event=${args.event} user=${args.user} status=${result.status}`,
        config.output.defaultFormat === "json",
      );
    });

  /* ── jobs ─────────────────────────────────────────── */

  const jobsCommand = program.command("jobs").description("Background job queue management");

  jobsCommand
    .command("stats")
    .description("Show queue statistics")
    .action(async () => {
      const config = await resolveRuntimeConfig();
      const result = jobsStats(config);
      outputResult(
        "jobs.stats",
        config.env,
        result,
        `jobs: pending=${result.pending} running=${result.running} failed=${result.failed} dead=${result.dead} completed=${result.completed}`,
        config.output.defaultFormat === "json",
      );
    });

  jobsCommand
    .command("process")
    .description("Process jobs from the queue")
    .option("--once", "process a single job and exit")
    .option("--poll", "continuously poll for jobs")
    .option("--interval <ms>", "poll interval in milliseconds", "5000")
    .action(async (args: { once?: boolean; poll?: boolean; interval?: string }) => {
      const config = await resolveRuntimeConfig();
      if (args.poll) {
        const interval = parseInt(args.interval ?? "5000", 10);
        io.writeStdout(`Starting job processor (poll interval: ${interval}ms). Press Ctrl+C to stop.\n`);
        await jobsProcessPoll(config, interval);
        io.writeStdout("Job processor stopped.\n");
      } else {
        const result = await jobsProcessOnce(config);
        outputResult(
          "jobs.process",
          config.env,
          result,
          `jobs process: ${result.processed ? "processed 1 job" : "no jobs available"}`,
          config.output.defaultFormat === "json",
        );
      }
    });

  jobsCommand
    .command("retry-dead")
    .description("Re-enqueue all dead-letter jobs")
    .action(async () => {
      const config = await resolveRuntimeConfig();
      const result = jobsRetryDead(config);
      outputResult(
        "jobs.retry-dead",
        config.env,
        result,
        `jobs retry-dead: retried=${result.retried}`,
        config.output.defaultFormat === "json",
      );
    });

  jobsCommand
    .command("purge-completed")
    .description("Remove completed jobs older than a threshold")
    .requiredOption("--before <duration>", "age threshold (e.g. 7d, 30d)")
    .action(async (args: { before: string }) => {
      const config = await resolveRuntimeConfig();
      const match = args.before.match(/^(\d+)d$/);
      const days = match ? parseInt(match[1], 10) : 7;
      const cutoff = new Date(Date.now() - days * 86400 * 1000).toISOString();
      const result = jobsPurgeCompleted(config, cutoff);
      outputResult(
        "jobs.purge-completed",
        config.env,
        result,
        `jobs purge-completed: purged=${result.purged} (before ${days}d)`,
        config.output.defaultFormat === "json",
      );
    });

  program
    .command("index-content")
    .description("Index all content/**/*.md files into the embeddings table using OpenAI embeddings")
    .action(async () => {
      const config = await resolveRuntimeConfig();
      const { indexContentCorpus } = await import("../lib/vector/indexer");
      const { openDb } = await import("../platform/db");
      const db = openDb(config);
      try {
        const result = await indexContentCorpus(db);
        if (result.alreadyIndexed) {
          writeText(io, `Content already indexed (${result.chunks} chunks).`);
        } else {
          writeText(io, `Indexed ${result.chunks} chunks from ${result.files} files`);
          outputResult(
            "index-content",
            config.env,
            result,
            `index-content: chunks=${result.chunks} files=${result.files}`,
            config.output.defaultFormat === "json",
          );
        }
      } finally {
        db.close();
      }
    });

  return program;
};

export const runCli = async (argv: string[], io: CliIo = defaultIo): Promise<ExitCode> => {
  const program = createProgram(io);

  if (argv.length === 0) {
    program.outputHelp();
    return 2;
  }

  try {
    await program.parseAsync(argv, { from: "user" });
    return 0;
  } catch (error) {
    const exitCode = mapErrorToExitCode(error);

    if (error instanceof CommanderError) {
      return exitCode;
    }

    if (error instanceof CliError) {
      io.writeStderr(`${error.message}\n`);
      return exitCode;
    }

    const unexpectedMessage = error instanceof Error ? error.message : "Unknown error";
    io.writeStderr(`${unexpectedMessage}\n`);
    return exitCode;
  }
};
