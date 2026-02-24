/**
 * Onboarding email sequences.
 *
 * Milestone-driven emails that fire automatically as users
 * progress through onboarding steps.
 */

import type { TransactionalEmailMessage } from "@/core/ports/transactional-email";

/* ── email builders ─────────────────────────────────── */

const wrapHtml = (body: string): string =>
  `<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;line-height:1.5;color:#333;">${body}</body></html>`;

export function buildProfileCompleteEmail(
  email: string,
  baseUrl: string,
): TransactionalEmailMessage {
  const eventsUrl = `${baseUrl}/events`;

  return {
    to: email,
    subject: "Your profile is all set!",
    textBody: [
      "Your profile is complete — nice work!",
      "",
      `Browse upcoming events: ${eventsUrl}`,
      "",
      "You can update your profile at any time from your account page.",
    ].join("\n"),
    htmlBody: wrapHtml(`
      <h2>Your profile is all set!</h2>
      <p>Nice work completing your profile.</p>
      <p><a href="${eventsUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">Browse Events</a></p>
      <p style="color:#666;font-size:14px;">You can update your profile at any time from your account page.</p>
    `),
    tag: "onboarding-profile-complete",
  };
}

export function buildIntakeReceivedEmail(
  email: string,
  baseUrl: string,
): TransactionalEmailMessage {
  const dashboardUrl = `${baseUrl}/dashboard`;

  return {
    to: email,
    subject: "We received your client intake form",
    textBody: [
      "Thank you for submitting your client intake form.",
      "",
      "Our team will review your information and follow up shortly.",
      "",
      `Check your dashboard for updates: ${dashboardUrl}`,
    ].join("\n"),
    htmlBody: wrapHtml(`
      <h2>Intake Form Received</h2>
      <p>Thank you for submitting your client intake form.</p>
      <p>Our team will review your information and follow up shortly.</p>
      <p><a href="${dashboardUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">View Dashboard</a></p>
    `),
    tag: "onboarding-intake-received",
  };
}

export function buildClientRoleGrantedEmail(
  email: string,
  baseUrl: string,
): TransactionalEmailMessage {
  const dashboardUrl = `${baseUrl}/dashboard`;

  return {
    to: email,
    subject: "You now have full client access",
    textBody: [
      "Congratulations! You have been granted full client access.",
      "",
      "You can now view your project dashboard, manage engagements,",
      "and access all client features.",
      "",
      `Go to your dashboard: ${dashboardUrl}`,
    ].join("\n"),
    htmlBody: wrapHtml(`
      <h2>Welcome, Client!</h2>
      <p>Congratulations — you now have full client access.</p>
      <p>You can view your project dashboard, manage engagements, and access all client features.</p>
      <p><a href="${dashboardUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">Go to Dashboard</a></p>
    `),
    tag: "onboarding-client-granted",
  };
}

/* ── milestone → email map ──────────────────────────── */

export type OnboardingMilestone =
  | "profile_complete"
  | "intake_received"
  | "client_role_granted";

/**
 * Build the appropriate email for an onboarding milestone.
 * Returns `null` for milestones that don't trigger an email.
 */
export function buildOnboardingEmail(
  milestone: OnboardingMilestone,
  email: string,
  baseUrl: string,
): TransactionalEmailMessage | null {
  switch (milestone) {
    case "profile_complete":
      return buildProfileCompleteEmail(email, baseUrl);
    case "intake_received":
      return buildIntakeReceivedEmail(email, baseUrl);
    case "client_role_granted":
      return buildClientRoleGrantedEmail(email, baseUrl);
    default:
      return null;
  }
}

/**
 * Determine whether a user has opted out of non-essential emails.
 * Stub: always returns false (opt-in by default). Replace with
 * real preference check when email-preferences table exists.
 */
export function hasOptedOutOfMarketing(_userId: string): boolean {
  return false;
}
