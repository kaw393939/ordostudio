/**
 * Custom analytics events for key platform actions.
 *
 * Each constant defines the event name sent to the analytics provider.
 * Using constants prevents typos and makes it easy to audit which events
 * are tracked across the codebase.
 */

import { analytics, type AnalyticsEvent } from "@/lib/analytics";

/* ── Event name constants ────────────────────────────── */

export const ANALYTICS_EVENTS = {
  /* Onboarding */
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_DISMISSED: "onboarding_dismissed",

  /* Authentication */
  USER_REGISTERED: "user_registered",
  USER_LOGGED_IN: "user_logged_in",
  USER_LOGGED_OUT: "user_logged_out",
  EMAIL_VERIFIED: "email_verified",

  /* Intake & roles */
  INTAKE_SUBMITTED: "intake_submitted",
  ROLE_PROVISIONED: "role_provisioned",
  ROLE_REQUEST_SUBMITTED: "role_request_submitted",

  /* Events */
  EVENT_VIEWED: "event_viewed",
  EVENT_REGISTERED: "event_registered",

  /* Navigation */
  CTA_CLICKED: "cta_clicked",
  PAGE_VIEWED: "page_viewed",

  /* Admin */
  ADMIN_ACTION: "admin_action",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/* ── Typed helper for tracking with required metadata ── */

/**
 * Track a custom event with structured metadata.
 * This is a thin wrapper around `analytics.capture()` that enforces
 * event names from the known enum.
 */
export function trackEvent(name: AnalyticsEventName, properties?: AnalyticsEvent): void {
  analytics.capture(name, properties);
}
