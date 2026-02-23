import type { TransactionalEmailMessage } from "../ports/transactional-email";

/* ── helpers ───────────────────────────────────────── */

const wrapHtml = (body: string): string =>
  `<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;line-height:1.5;color:#333;">${body}</body></html>`;

/* ── templates ─────────────────────────────────────── */

export const buildPasswordResetEmail = (
  email: string,
  resetToken: string,
  baseUrl: string,
): TransactionalEmailMessage => {
  const resetUrl = `${baseUrl}/password-reset/confirm?token=${encodeURIComponent(resetToken)}`;

  const textBody = [
    "Password Reset Request",
    "",
    "We received a request to reset your password.",
    "",
    `Reset your password: ${resetUrl}`,
    "",
    "This link expires in 30 minutes.",
    "",
    "If you did not request this, you can safely ignore this email.",
  ].join("\n");

  const htmlBody = wrapHtml(`
    <h2>Password Reset Request</h2>
    <p>We received a request to reset your password.</p>
    <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">Reset Your Password</a></p>
    <p style="color:#666;font-size:14px;">This link expires in 30 minutes.</p>
    <p style="color:#666;font-size:14px;">If you did not request this, you can safely ignore this email.</p>
  `);

  return {
    to: email,
    subject: "Password Reset Request",
    textBody,
    htmlBody,
    tag: "password-reset",
  };
};

export const buildEmailVerificationEmail = (
  email: string,
  verifyToken: string,
  baseUrl: string,
): TransactionalEmailMessage => {
  const verifyUrl = `${baseUrl}/verify/confirm?token=${encodeURIComponent(verifyToken)}`;

  const textBody = [
    "Verify Your Email Address",
    "",
    "Please verify your email address to activate your account.",
    "",
    `Verify your email: ${verifyUrl}`,
    "",
    "This link expires in 30 minutes.",
  ].join("\n");

  const htmlBody = wrapHtml(`
    <h2>Verify Your Email Address</h2>
    <p>Please verify your email address to activate your account.</p>
    <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">Verify Email</a></p>
    <p style="color:#666;font-size:14px;">This link expires in 30 minutes.</p>
  `);

  return {
    to: email,
    subject: "Verify Your Email Address",
    textBody,
    htmlBody,
    tag: "email-verification",
  };
};

export const buildWelcomeEmail = (
  email: string,
  baseUrl: string,
): TransactionalEmailMessage => {
  const loginUrl = `${baseUrl}/login`;

  const textBody = [
    "Welcome!",
    "",
    "Your account has been created successfully.",
    "",
    `Log in here: ${loginUrl}`,
    "",
    "Thank you for registering.",
  ].join("\n");

  const htmlBody = wrapHtml(`
    <h2>Welcome!</h2>
    <p>Your account has been created successfully.</p>
    <p><a href="${loginUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">Log In</a></p>
    <p>Thank you for registering.</p>
  `);

  return {
    to: email,
    subject: "Welcome to the Platform",
    textBody,
    htmlBody,
    tag: "welcome",
  };
};

export const buildRegistrationConfirmationEmail = (
  email: string,
  eventTitle: string,
  eventDate: string,
  baseUrl: string,
): TransactionalEmailMessage => {
  const eventsUrl = `${baseUrl}/events`;

  const textBody = [
    "Registration Confirmed",
    "",
    `You have been registered for: ${eventTitle}`,
    `Date: ${eventDate}`,
    "",
    `View events: ${eventsUrl}`,
  ].join("\n");

  const htmlBody = wrapHtml(`
    <h2>Registration Confirmed</h2>
    <p>You have been registered for: <strong>${eventTitle}</strong></p>
    <p>Date: ${eventDate}</p>
    <p><a href="${eventsUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">View Events</a></p>
  `);

  return {
    to: email,
    subject: `Registration Confirmed: ${eventTitle}`,
    textBody,
    htmlBody,
    tag: "registration-confirmation",
  };
};
