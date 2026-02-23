/**
 * Platform-layer re-export barrel for runtime services.
 *
 * Combines the commonly co-imported db + audit symbols into one import
 * target. Used by the web delivery layer (lib/api/) which needs both
 * openDb and appendAuditLog in most files.
 */
export { openDb, openCliDb } from "./db";
export { appendAuditLog, appendServiceAudit } from "./audit";
