/**
 * Triage Email Templates
 *
 * Automated response emails triggered by AI triage results.
 * Only sent for categories where auto-response is appropriate
 * (never for urgent_escalation or spam).
 */

import type { TransactionalEmailMessage } from "@/core/ports/transactional-email";
import { type TriageCategory, CATEGORY_LABELS } from "./triage";

const wrapHtml = (body: string): string =>
  `<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;line-height:1.5;color:#333;">${body}</body></html>`;

/* ── per-category templates ─────────────────────────── */

function buildGeneralInquiryResponse(
  email: string,
  summary: string,
  baseUrl: string,
): TransactionalEmailMessage {
  return {
    to: email,
    subject: "We received your request",
    textBody: [
      "Thank you for reaching out to Studio Ordo.",
      "",
      `We've received your request: "${summary}"`,
      "",
      "Our team will review it and get back to you within 1-2 business days.",
      "",
      `In the meantime, you may find helpful information in our FAQ: ${baseUrl}/faq`,
      "",
      "Best regards,",
      "Studio Ordo Team",
    ].join("\n"),
    htmlBody: wrapHtml(`
      <h2>We received your request</h2>
      <p>Thank you for reaching out to Studio Ordo.</p>
      <p>We've received your request: <em>"${summary}"</em></p>
      <p>Our team will review it and get back to you within <strong>1-2 business days</strong>.</p>
      <p>In the meantime, you may find helpful information in our <a href="${baseUrl}/faq">FAQ</a>.</p>
      <p style="color:#666;font-size:14px;">Best regards,<br/>Studio Ordo Team</p>
    `),
    tag: "triage-auto-general-inquiry",
  };
}

function buildBillingSupportResponse(
  email: string,
  summary: string,
  baseUrl: string,
): TransactionalEmailMessage {
  return {
    to: email,
    subject: "Your billing request has been received",
    textBody: [
      "Thank you for contacting Studio Ordo about a billing matter.",
      "",
      `Request: "${summary}"`,
      "",
      "Our billing team has been notified and will respond within 1 business day.",
      "",
      `You can review your billing details at: ${baseUrl}/settings/billing`,
      "",
      "Best regards,",
      "Studio Ordo Billing Team",
    ].join("\n"),
    htmlBody: wrapHtml(`
      <h2>Your billing request has been received</h2>
      <p>Thank you for contacting Studio Ordo about a billing matter.</p>
      <p>Request: <em>"${summary}"</em></p>
      <p>Our billing team has been notified and will respond within <strong>1 business day</strong>.</p>
      <p><a href="${baseUrl}/settings/billing" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">View Billing</a></p>
      <p style="color:#666;font-size:14px;">Best regards,<br/>Studio Ordo Billing Team</p>
    `),
    tag: "triage-auto-billing-support",
  };
}

function buildTechnicalIssueResponse(
  email: string,
  summary: string,
  baseUrl: string,
): TransactionalEmailMessage {
  return {
    to: email,
    subject: "Your technical issue has been logged",
    textBody: [
      "Thank you for reporting a technical issue to Studio Ordo.",
      "",
      `Issue: "${summary}"`,
      "",
      "Our engineering support team has been notified. We may reach out",
      "to request additional details or reproduction steps.",
      "",
      "We aim to respond within 1 business day.",
      "",
      "Best regards,",
      "Studio Ordo Support",
    ].join("\n"),
    htmlBody: wrapHtml(`
      <h2>Your technical issue has been logged</h2>
      <p>Thank you for reporting a technical issue to Studio Ordo.</p>
      <p>Issue: <em>"${summary}"</em></p>
      <p>Our engineering support team has been notified. We may reach out to request additional details or reproduction steps.</p>
      <p>We aim to respond within <strong>1 business day</strong>.</p>
      <p style="color:#666;font-size:14px;">Best regards,<br/>Studio Ordo Support</p>
    `),
    tag: "triage-auto-technical-issue",
  };
}

function buildFeatureRequestResponse(
  email: string,
  summary: string,
  _baseUrl: string,
): TransactionalEmailMessage {
  return {
    to: email,
    subject: "Thank you for your feature suggestion",
    textBody: [
      "Thank you for your feature suggestion!",
      "",
      `Suggestion: "${summary}"`,
      "",
      "We've logged it in our product backlog and will consider it",
      "for future development. We appreciate your input in helping",
      "us improve Studio Ordo.",
      "",
      "Best regards,",
      "Studio Ordo Product Team",
    ].join("\n"),
    htmlBody: wrapHtml(`
      <h2>Thank you for your feature suggestion</h2>
      <p>Suggestion: <em>"${summary}"</em></p>
      <p>We've logged it in our product backlog and will consider it for future development.</p>
      <p>We appreciate your input in helping us improve Studio Ordo.</p>
      <p style="color:#666;font-size:14px;">Best regards,<br/>Studio Ordo Product Team</p>
    `),
    tag: "triage-auto-feature-request",
  };
}

function buildPartnershipResponse(
  email: string,
  summary: string,
  _baseUrl: string,
): TransactionalEmailMessage {
  return {
    to: email,
    subject: "Partnership inquiry received",
    textBody: [
      "Thank you for your interest in partnering with Studio Ordo.",
      "",
      `Inquiry: "${summary}"`,
      "",
      "Our partnerships team will review your inquiry and follow up",
      "within 2-3 business days.",
      "",
      "Best regards,",
      "Studio Ordo Partnerships",
    ].join("\n"),
    htmlBody: wrapHtml(`
      <h2>Partnership inquiry received</h2>
      <p>Inquiry: <em>"${summary}"</em></p>
      <p>Our partnerships team will review your inquiry and follow up within <strong>2-3 business days</strong>.</p>
      <p style="color:#666;font-size:14px;">Best regards,<br/>Studio Ordo Partnerships</p>
    `),
    tag: "triage-auto-partnership",
  };
}

/* ── dispatcher ─────────────────────────────────────── */

/** Categories that receive automated responses. */
const AUTO_RESPONSE_CATEGORIES: ReadonlySet<TriageCategory> = new Set([
  "general_inquiry",
  "billing_support",
  "technical_issue",
  "feature_request",
  "partnership",
]);

/**
 * Whether we have a template for this category.
 */
export function hasAutoResponseTemplate(category: TriageCategory): boolean {
  return AUTO_RESPONSE_CATEGORIES.has(category);
}

/**
 * Build an automated response email for a triaged request.
 * Returns null for categories that should not be auto-responded to.
 */
export function buildTriageResponseEmail(
  category: TriageCategory,
  email: string,
  summary: string,
  baseUrl: string,
): TransactionalEmailMessage | null {
  switch (category) {
    case "general_inquiry":
      return buildGeneralInquiryResponse(email, summary, baseUrl);
    case "billing_support":
      return buildBillingSupportResponse(email, summary, baseUrl);
    case "technical_issue":
      return buildTechnicalIssueResponse(email, summary, baseUrl);
    case "feature_request":
      return buildFeatureRequestResponse(email, summary, baseUrl);
    case "partnership":
      return buildPartnershipResponse(email, summary, baseUrl);
    case "urgent_escalation":
    case "spam":
    default:
      return null;
  }
}

/**
 * Re-export the category labels for use in email context.
 */
export { CATEGORY_LABELS };
