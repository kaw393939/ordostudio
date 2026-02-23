import { openDb } from "@/platform/db";
import { appendServiceAudit } from "@/platform/audit";
import type { AppConfig } from "@/platform/types";
import { AuditSink } from "@/core/ports/repositories";

export class SqliteAuditSink implements AuditSink {
  constructor(private readonly config: AppConfig) {}

  record(args: {
    action: string;
    requestId: string;
    targetType: "system" | "event" | "registration";
    metadata?: Record<string, unknown>;
  }): void {
    const db = openDb(this.config);
    try {
      appendServiceAudit(db, args);
    } finally {
      db.close();
    }
  }
}
