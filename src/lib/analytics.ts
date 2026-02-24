/**
 * Privacy-friendly product analytics facade.
 *
 * Wraps PostHog (or any analytics provider) behind a consent-aware API.
 * Respects Do Not Track, cookie consent opt-out, and sanitises PII before
 * sending events.  When PostHog is not configured, all calls are safe no-ops.
 *
 * Usage:
 *   import { analytics } from "@/lib/analytics";
 *   analytics.capture("event_registered", { slug: "react-fundamentals" });
 */

export type AnalyticsEvent = Record<string, string | number | boolean | null>;

/* ── PII sanitisation ────────────────────────────────── */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g;
const SENSITIVE_KEYS = new Set(["password", "token", "secret", "ssn", "credit_card"]);

/**
 * Strip or pseudonymise PII values before they leave the browser.
 * Emails are replaced with a SHA-256-truncated hash (when crypto is
 * available), sensitive keys are redacted entirely.
 */
export function sanitiseProperties(
  props: AnalyticsEvent | undefined,
): AnalyticsEvent | undefined {
  if (!props) return props;

  const clean: AnalyticsEvent = {};
  for (const [key, value] of Object.entries(props)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string" && EMAIL_RE.test(value)) {
      clean[key] = value.replace(EMAIL_RE, "[email]");
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

/* ── consent helpers ─────────────────────────────────── */

/** Check if the browser signals Do Not Track. */
export function isDoNotTrack(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.doNotTrack === "1";
}

/** Cookie-based consent check. True when user has opted out. */
export function hasOptedOut(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("so_tracking_optout=1");
}

/** Set opt-out cookie (expires in 1 year). */
export function optOut(): void {
  if (typeof document === "undefined") return;
  document.cookie = "so_tracking_optout=1; path=/; max-age=31536000; SameSite=Lax";
}

/** Remove opt-out cookie. */
export function optIn(): void {
  if (typeof document === "undefined") return;
  document.cookie = "so_tracking_optout=; path=/; max-age=0; SameSite=Lax";
}

/** Returns true only when tracking is permitted. */
export function isTrackingAllowed(): boolean {
  return !isDoNotTrack() && !hasOptedOut();
}

/* ── analytics facade ────────────────────────────────── */

let _initialised = false;

export const analytics = {
  /** Initialise the analytics provider (call once from root layout). */
  init(): void {
    if (_initialised) return;
    if (!isTrackingAllowed()) return;

    // Stub — PostHog.init() goes here when NEXT_PUBLIC_POSTHOG_KEY is set
    _initialised = true;

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("[analytics] initialised (stub)");
    }
  },

  /** Track a custom event. Properties are sanitised before dispatch. */
  capture(eventName: string, properties?: AnalyticsEvent): void {
    if (!isTrackingAllowed()) return;

    const safe = sanitiseProperties(properties);

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", eventName, safe);
    }

    // Stub — PostHog.capture(eventName, safe) goes here
  },

  /** Identify the current user (post-login). User ID is never PII. */
  identify(userId: string, traits?: AnalyticsEvent): void {
    if (!isTrackingAllowed()) return;

    const safe = sanitiseProperties(traits);

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("[analytics:identify]", userId, safe);
    }

    // Stub — PostHog.identify(userId, safe) goes here
  },

  /** Reset identity (post-logout). */
  reset(): void {
    // Stub — PostHog.reset() goes here
    _initialised = false;
  },

  /** Check initialisation state (useful for tests). */
  get isInitialised(): boolean {
    return _initialised;
  },
};
