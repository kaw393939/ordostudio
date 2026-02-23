import { AuditSink } from "../ports/repositories";

export const executeWithAudit = <T>(args: {
  action: string;
  requestId: string;
  targetType: "system" | "event" | "registration";
  audit: AuditSink;
  execute: () => T;
  metadata?: (result: T) => Record<string, unknown>;
}): T => {
  const result = args.execute();
  args.audit.record({
    action: args.action,
    requestId: args.requestId,
    targetType: args.targetType,
    metadata: args.metadata ? args.metadata(result) : undefined,
  });
  return result;
};
