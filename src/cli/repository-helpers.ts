/**
 * CLI-layer re-exports for backward compatibility.
 *
 * The canonical definitions now live in:
 *   - @/platform/db (openDb / openCliDb)
 *   - @/platform/audit (appendAuditLog, appendServiceAudit)
 *
 * Non-CLI consumers should import directly from those modules.
 */
export { openDb, openCliDb } from "@/platform/db";
export { appendAuditLog, appendServiceAudit } from "@/platform/audit";
