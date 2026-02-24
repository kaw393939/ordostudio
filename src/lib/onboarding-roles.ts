/**
 * Automated role provisioning for onboarding.
 *
 * When a user completes the required client onboarding milestones
 * (submit_intake + sign_agreement), this module assigns the CLIENT role
 * and triggers the appropriate welcome email.
 */

import type Database from "better-sqlite3";
import type { TransactionalEmailPort } from "@/core/ports/transactional-email";
import { assignUserRole, ensureRoleByName } from "@/adapters/sqlite/auth-queries";
import { listUserRoleNames } from "@/adapters/sqlite/auth-queries";
import { sendEmailAsync } from "@/platform/email-queue-bridge";
import { buildClientRoleGrantedEmail } from "@/lib/onboarding-emails";
import { appendAuditLog } from "@/platform/audit";
import { broadcastStepComplete } from "@/app/api/v1/onboarding/stream/route";
import type { OnboardingProgress } from "@/lib/onboarding";
import { shouldProvisionClientRole } from "@/lib/onboarding";

export type ProvisionResult =
  | { provisioned: true; roleId: string }
  | { provisioned: false; reason: string };

/**
 * Check onboarding progress and provision the CLIENT role if milestones are met.
 *
 * Idempotent: if the user already has the CLIENT role, it's a no-op.
 */
export function provisionClientRole(
  db: Database.Database,
  progress: OnboardingProgress,
  opts: {
    email: string;
    baseUrl: string;
    requestId: string;
    emailPort?: TransactionalEmailPort;
  },
): ProvisionResult {
  if (!shouldProvisionClientRole(progress)) {
    return { provisioned: false, reason: "Required milestones not met" };
  }

  const existingRoles = listUserRoleNames(db, progress.userId);
  if (existingRoles.includes("CLIENT")) {
    return { provisioned: false, reason: "CLIENT role already assigned" };
  }

  // CLIENT isn't in the union type yet — cast through unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roleId = ensureRoleByName(db, "CLIENT" as any);
  assignUserRole(db, { userId: progress.userId, roleId });

  /* ── audit trail ── */
  appendAuditLog(db, {
    actorType: "SERVICE",
    actorId: null,
    action: "api.onboarding.provision_client_role",
    targetType: "api",
    requestId: opts.requestId,
    metadata: { userId: progress.userId },
  });

  /* ── notification email ── */
  if (opts.emailPort) {
    const msg = buildClientRoleGrantedEmail(opts.email, opts.baseUrl);
    sendEmailAsync(opts.emailPort, msg);
  }

  /* ── broadcast to SSE ── */
  broadcastStepComplete(progress.userId, "client_role_provisioned");

  return { provisioned: true, roleId };
}
