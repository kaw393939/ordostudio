import { SqliteAuditSink } from "@/adapters/sqlite/audit-sink";
import { AppConfig } from "./types";

export const recordAudit = (
  config: AppConfig,
  args: {
    action: string;
    requestId: string;
    targetType: "system" | "event" | "registration";
    metadata?: Record<string, unknown>;
  },
): void => {
  new SqliteAuditSink(config).record({
    action: args.action,
    requestId: args.requestId,
    targetType: args.targetType,
    metadata: args.metadata,
  });
};

export const recordSystemAudit = (
  config: AppConfig,
  args: {
    action: string;
    requestId: string;
    metadata?: Record<string, unknown>;
  },
): void => {
  recordAudit(config, {
    action: args.action,
    requestId: args.requestId,
    targetType: "system",
    metadata: args.metadata,
  });
};
