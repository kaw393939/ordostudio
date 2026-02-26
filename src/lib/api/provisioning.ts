/**
 * Sprint 38 — Account Provisioning Library
 *
 * Automates the path from a QUALIFIED contact to a live user with onboarding tasks.
 */

import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import type Database from "better-sqlite3";

import {
  tryInsertUserAccount,
  insertApiCredential,
  ensureRoleByName,
  assignUserRole,
  findUserIdByEmail,
} from "@/adapters/sqlite/auth-queries";
import { writeFeedEvent } from "@/lib/api/feed-events";
import { sendEmailAsync } from "@/platform/email-queue-bridge";
import { resolveTransactionalEmailPort } from "@/platform/email";
import type { TransactionalEmailMessage } from "@/core/ports/transactional-email";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ContactNotFoundError extends Error {
  constructor(id: string) {
    super(`Contact ${id} not found.`);
    this.name = "ContactNotFoundError";
  }
}

export class ContactNotQualifiedError extends Error {
  constructor(status: string) {
    super(`Cannot provision: contact status is '${status}', expected 'QUALIFIED'.`);
    this.name = "ContactNotQualifiedError";
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function generateTempPassword(): string {
  // 12-char alphanumeric password
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function buildProvisioningWelcomeEmail(
  email: string,
  tempPassword: string,
  baseUrl: string,
): TransactionalEmailMessage {
  const loginUrl = `${baseUrl}/login`;

  const textBody = [
    "Your application has been approved.",
    "",
    `Your login: ${email}`,
    `Temporary password: ${tempPassword}`,
    "",
    `Log in and complete your onboarding checklist: ${loginUrl}`,
    "",
    "— Studio Ordo",
  ].join("\n");

  const htmlBody = `<!doctype html><html><body style="font-family:sans-serif">
<h2>Welcome to Studio Ordo</h2>
<p>Your application has been approved.</p>
<p><strong>Login:</strong> ${email}<br/>
<strong>Temporary password:</strong> ${tempPassword}</p>
<p><a href="${loginUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">Complete your onboarding</a></p>
<p>— Studio Ordo</p>
</body></html>`;

  return {
    to: email,
    subject: "Welcome to Studio Ordo — your next step",
    textBody,
    htmlBody,
    tag: "onboarding-provision",
  };
}

// ---------------------------------------------------------------------------
// provisionAccount
// ---------------------------------------------------------------------------

export interface ProvisionResult {
  userId: string;
  email: string;
  tempPassword: string;
  alreadyExisted: boolean;
}

export async function provisionAccount(
  db: Database.Database,
  contactId: string,
): Promise<ProvisionResult> {
  // 1. Load and validate contact
  const contact = db
    .prepare(
      "SELECT id, email, full_name, status, user_id FROM contacts WHERE id = ?",
    )
    .get(contactId) as
    | { id: string; email: string; full_name: string | null; status: string; user_id: string | null }
    | undefined;

  if (!contact) {
    throw new ContactNotFoundError(contactId);
  }

  // 2. Check if user already exists (idempotency — check BEFORE status validation
  //    so that re-calling after status advances to ONBOARDING still returns 409).
  const existingUserId = contact.user_id ?? findUserIdByEmail(db, contact.email);

  if (existingUserId) {
    // Ensure contact links to the existing user
    db.prepare(
      "UPDATE contacts SET user_id = ?, status = 'ONBOARDING', updated_at = ? WHERE id = ?",
    ).run(existingUserId, new Date().toISOString(), contactId);

    return {
      userId: existingUserId,
      email: contact.email,
      tempPassword: "",
      alreadyExisted: true,
    };
  }

  // 3. Enforce QUALIFIED status for first-time provisioning
  if (contact.status !== "QUALIFIED") {
    throw new ContactNotQualifiedError(contact.status);
  }

  // 4. Create user + progress in a transaction
  const tempPassword = generateTempPassword();
  const passwordHash = await hash(tempPassword, {
    algorithm: 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const userId = randomUUID();
  const now = new Date().toISOString();

  db.transaction(() => {
    // Create user account
    tryInsertUserAccount(db, {
      id: userId,
      email: contact.email,
      status: "ACTIVE",
      createdAtIso: now,
      updatedAtIso: now,
    });

    // Set password credential
    insertApiCredential(db, {
      userId,
      passwordHash,
      createdAtIso: now,
      updatedAtIso: now,
    });

    // Assign USER role
    const userRoleId = ensureRoleByName(db, "USER");
    assignUserRole(db, { userId, roleId: userRoleId });

    // 4. Link contact → user + advance status to ONBOARDING
    db.prepare(
      "UPDATE contacts SET user_id = ?, status = 'ONBOARDING', updated_at = ? WHERE id = ?",
    ).run(userId, now, contactId);

    // 5. Provision onboarding tasks: 'all' role tasks
    const tasks = db
      .prepare(
        "SELECT id FROM onboarding_tasks WHERE role = 'all' OR role = 'apprentice' ORDER BY position ASC",
      )
      .all() as Array<{ id: string }>;

    for (const task of tasks) {
      db.prepare(
        "INSERT OR IGNORE INTO onboarding_progress (id, user_id, task_id, created_at) VALUES (?, ?, ?, ?)",
      ).run(randomUUID(), userId, task.id, now);
    }

    // 7. Write feed event
    writeFeedEvent(db, {
      userId,
      type: "OnboardingProgress",
      title: "Account provisioned",
      description: "Your Studio Ordo account has been created. Complete your onboarding checklist.",
      actionUrl: "/dashboard",
    });
  })();

  // 6. Send welcome email (outside transaction — non-fatal)
  try {
    const emailPort = resolveTransactionalEmailPort();
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const msg = buildProvisioningWelcomeEmail(contact.email, tempPassword, baseUrl);
    sendEmailAsync(emailPort, msg);
  } catch {
    // Non-fatal: provisioning succeeds even if email fails
  }

  return {
    userId,
    email: contact.email,
    tempPassword,
    alreadyExisted: false,
  };
}

// ---------------------------------------------------------------------------
// checkOnboardingComplete  (called after each task completion)
// ---------------------------------------------------------------------------

export function checkOnboardingComplete(
  db: Database.Database,
  userId: string,
): boolean {
  // Count required tasks that are not yet completed
  const pending = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM onboarding_progress op
       JOIN onboarding_tasks ot ON op.task_id = ot.id
       WHERE op.user_id = ?
         AND ot.required = 1
         AND op.completed = 0`,
    )
    .get(userId) as { count: number };

  if (pending.count > 0) {
    return false;
  }

  // All required tasks done — advance contact to ACTIVE
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE contacts SET status = 'ACTIVE', updated_at = ? WHERE user_id = ?",
  ).run(now, userId);

  // Fire completion feed event
  writeFeedEvent(db, {
    userId,
    type: "OnboardingProgress",
    title: "Onboarding complete",
    description: "You have completed all required onboarding steps. Welcome to Studio Ordo.",
    actionUrl: "/dashboard",
  });

  return true;
}
