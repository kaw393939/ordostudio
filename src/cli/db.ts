import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { authError, preconditionError } from "./errors";
import { AppConfig, RuntimeEnv } from "./types";

interface Migration {
  name: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    name: "001_core_schema",
    sql: `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  UNIQUE(user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS service_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  last_used_at TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL,
  capacity INTEGER,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  UNIQUE(event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  request_id TEXT NOT NULL
);
`,
  },
  {
    name: "002_service_catalog_core",
    sql: `
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  audience TEXT NOT NULL,
  delivery_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  booking_url TEXT NOT NULL,
  outcomes_json TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS offer_packages (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  scope TEXT NOT NULL,
  price_label TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
);
`,
  },
  {
    name: "003_intake_qualification_pipeline",
    sql: `
CREATE TABLE IF NOT EXISTS intake_requests (
  id TEXT PRIMARY KEY,
  offer_slug TEXT,
  audience TEXT NOT NULL,
  organization_name TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  goals TEXT NOT NULL,
  timeline TEXT,
  constraints TEXT,
  status TEXT NOT NULL,
  owner_user_id TEXT,
  priority INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS intake_status_history (
  id TEXT PRIMARY KEY,
  intake_request_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (intake_request_id) REFERENCES intake_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);
`,
  },
  {
    name: "004_event_delivery_logistics",
    sql: `
CREATE TABLE IF NOT EXISTS event_delivery (
  event_id TEXT PRIMARY KEY,
  delivery_mode TEXT NOT NULL,
  location_text TEXT,
  meeting_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
`,
  },
  {
    name: "005_instructor_assignment_lifecycle",
    sql: `
CREATE TABLE IF NOT EXISTS instructors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  capabilities_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (status IN ('ACTIVE','INACTIVE'))
);

CREATE TABLE IF NOT EXISTS instructor_availability (
  id TEXT PRIMARY KEY,
  instructor_id TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  delivery_mode TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE,
  CHECK (delivery_mode IN ('ONLINE','IN_PERSON','HYBRID'))
);

CREATE TABLE IF NOT EXISTS event_instructor_assignments (
  event_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  instructor_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE SET NULL,
  CHECK (state IN ('TBA','PROPOSED','ASSIGNED','CONFIRMED','REASSIGNED'))
);

CREATE TABLE IF NOT EXISTS event_instructor_assignment_history (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  from_instructor_id TEXT,
  to_instructor_id TEXT,
  note TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (from_instructor_id) REFERENCES instructors(id) ON DELETE SET NULL,
  FOREIGN KEY (to_instructor_id) REFERENCES instructors(id) ON DELETE SET NULL,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (to_state IN ('TBA','PROPOSED','ASSIGNED','CONFIRMED','REASSIGNED'))
);
`,
  },
  {
    name: "006_event_engagement_type",
    sql: `
CREATE TABLE IF NOT EXISTS event_engagement (
  event_id TEXT PRIMARY KEY,
  engagement_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CHECK (engagement_type IN ('INDIVIDUAL','GROUP'))
);
`,
  },
  {
    name: "007_commercial_operations_core",
    sql: `
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  intake_request_id TEXT,
  event_id TEXT,
  offer_slug TEXT,
  client_email TEXT NOT NULL,
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (intake_request_id) REFERENCES intake_requests(id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('DRAFT','SENT','ACCEPTED','DECLINED','EXPIRED'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  proposal_id TEXT,
  intake_request_id TEXT,
  event_id TEXT,
  client_email TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  issued_at TEXT,
  due_at TEXT,
  paid_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL,
  FOREIGN KEY (intake_request_id) REFERENCES intake_requests(id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','VOID'))
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  paid_at TEXT NOT NULL,
  reference TEXT,
  recorded_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('RECORDED','REVERSED'))
);

CREATE TABLE IF NOT EXISTS proposal_status_history (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoice_status_history (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);
`,
  },
  {
    name: "008_client_portal_outcomes_followup",
    sql: `
CREATE TABLE IF NOT EXISTS engagement_sessions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  session_at TEXT NOT NULL,
  summary TEXT,
  outcomes_json TEXT,
  next_step TEXT,
  status TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('PLANNED','DELIVERED','FOLLOW_UP'))
);

CREATE TABLE IF NOT EXISTS engagement_action_items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  due_at TEXT,
  owner_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES engagement_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('OPEN','DONE'))
);

CREATE TABLE IF NOT EXISTS event_artifacts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  resource_url TEXT NOT NULL,
  scope TEXT NOT NULL,
  user_id TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (scope IN ('EVENT','USER'))
);

CREATE TABLE IF NOT EXISTS engagement_feedback (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (rating >= 1 AND rating <= 5)
);
`,
  },
  {
    name: "009_followup_workflow_reminders",
    sql: `
ALTER TABLE engagement_action_items RENAME TO engagement_action_items_legacy;

CREATE TABLE engagement_action_items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  due_at TEXT,
  owner_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES engagement_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('OPEN','IN_PROGRESS','DONE','BLOCKED'))
);

INSERT INTO engagement_action_items (id, session_id, description, status, due_at, owner_user_id, created_at, updated_at)
SELECT
  id,
  session_id,
  description,
  CASE
    WHEN status = 'DONE' THEN 'DONE'
    ELSE 'OPEN'
  END,
  due_at,
  owner_user_id,
  created_at,
  updated_at
FROM engagement_action_items_legacy;

DROP TABLE engagement_action_items_legacy;

CREATE TABLE IF NOT EXISTS engagement_action_item_reminders (
  id TEXT PRIMARY KEY,
  action_item_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL,
  reminder_for TEXT NOT NULL,
  status TEXT NOT NULL,
  acknowledged_at TEXT,
  acknowledged_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(action_item_id, reminder_type, reminder_for),
  FOREIGN KEY (action_item_id) REFERENCES engagement_action_items(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (reminder_type IN ('UPCOMING','OVERDUE')),
  CHECK (status IN ('PENDING','ACKNOWLEDGED'))
);
`,
  },
  {
    name: "010_studio_field_reports",
    sql: `
CREATE TABLE IF NOT EXISTS field_reports (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  key_insights TEXT NOT NULL,
  models TEXT NOT NULL,
  money TEXT NOT NULL,
  people TEXT NOT NULL,
  what_i_tried TEXT NOT NULL,
  client_advice TEXT NOT NULL,
  summary TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  featured_at TEXT,
  featured_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (featured_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (featured IN (0, 1))
);
`,
  },
  {
    name: "011_referrals_affiliates_foundation",
    sql: `
CREATE TABLE IF NOT EXISTS referral_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS referral_clicks (
  id TEXT PRIMARY KEY,
  referral_code_id TEXT NOT NULL,
  path TEXT NOT NULL,
  referer TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS referral_conversions (
  id TEXT PRIMARY KEY,
  referral_code_id TEXT NOT NULL,
  conversion_type TEXT NOT NULL,
  intake_request_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (intake_request_id) REFERENCES intake_requests(id) ON DELETE SET NULL,
  CHECK (conversion_type IN ('INTAKE_REQUEST'))
);
`,
  },
  {
    name: "012_ordo_brief_newsletter",
    sql: `
CREATE TABLE IF NOT EXISTS newsletter_issues (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  status TEXT NOT NULL,
  published_at TEXT,
  published_by TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('DRAFT','REVIEWED','PUBLISHED'))
);

CREATE TABLE IF NOT EXISTS newsletter_blocks (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  section TEXT NOT NULL,
  content_md TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(issue_id, section),
  FOREIGN KEY (issue_id) REFERENCES newsletter_issues(id) ON DELETE CASCADE,
  CHECK (section IN ('MODELS','MONEY','PEOPLE','FROM_FIELD','NEXT_STEPS'))
);

CREATE TABLE IF NOT EXISTS newsletter_issue_field_reports (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  field_report_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(issue_id, field_report_id, tag),
  FOREIGN KEY (issue_id) REFERENCES newsletter_issues(id) ON DELETE CASCADE,
  FOREIGN KEY (field_report_id) REFERENCES field_reports(id) ON DELETE CASCADE,
  CHECK (tag IN ('MODELS','MONEY','PEOPLE','FROM_FIELD'))
);

CREATE TABLE IF NOT EXISTS newsletter_issue_research_sources (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(issue_id, url),
  FOREIGN KEY (issue_id) REFERENCES newsletter_issues(id) ON DELETE CASCADE
);
`,
  },
  {
    name: "013_apprentice_profiles_directory",
    sql: `
CREATE TABLE IF NOT EXISTS apprentice_profiles (
  user_id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  headline TEXT,
  bio TEXT,
  location TEXT,
  website_url TEXT,
  tags TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING',
  approved_at TEXT,
  approved_by TEXT,
  suspended_at TEXT,
  suspended_by TEXT,
  suspension_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (suspended_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('PENDING','APPROVED','SUSPENDED'))
);
`,
  },
  {
    name: "014_deals_marketplace_core",
    sql: `
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  intake_id TEXT NOT NULL UNIQUE,
  offer_slug TEXT,
  status TEXT NOT NULL,
  referrer_user_id TEXT,
  requested_provider_user_id TEXT,
  provider_user_id TEXT,
  maestro_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (intake_id) REFERENCES intake_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (requested_provider_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (provider_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (maestro_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('QUEUED','ASSIGNED','MAESTRO_APPROVED','PAID','IN_PROGRESS','DELIVERED','CLOSED','REFUNDED'))
);

CREATE TABLE IF NOT EXISTS deal_status_history (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (to_status IN ('QUEUED','ASSIGNED','MAESTRO_APPROVED','PAID','IN_PROGRESS','DELIVERED','CLOSED','REFUNDED'))
);
`,
  },
  {
    name: "015_offer_catalog_union_pricing",
    sql: `
ALTER TABLE offers ADD COLUMN price_cents INTEGER;
ALTER TABLE offers ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE offers ADD COLUMN duration_label TEXT NOT NULL DEFAULT '';
ALTER TABLE offers ADD COLUMN refund_policy_key TEXT NOT NULL DEFAULT 'standard';
`,
  },
  {
    name: "016_deals_offer_slug_fk",
    sql: `
-- SQLite requires table rebuild to add a foreign key constraint.
PRAGMA foreign_keys=off;

ALTER TABLE deals RENAME TO deals_old;

CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  intake_id TEXT NOT NULL UNIQUE,
  offer_slug TEXT,
  status TEXT NOT NULL,
  referrer_user_id TEXT,
  requested_provider_user_id TEXT,
  provider_user_id TEXT,
  maestro_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (intake_id) REFERENCES intake_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (offer_slug) REFERENCES offers(slug) ON DELETE SET NULL,
  FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (requested_provider_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (provider_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (maestro_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('QUEUED','ASSIGNED','MAESTRO_APPROVED','PAID','IN_PROGRESS','DELIVERED','CLOSED','REFUNDED'))
);

INSERT INTO deals (
  id, intake_id, offer_slug, status, referrer_user_id, requested_provider_user_id, provider_user_id, maestro_user_id, created_at, updated_at
)
SELECT
  id, intake_id, offer_slug, status, referrer_user_id, requested_provider_user_id, provider_user_id, maestro_user_id, created_at, updated_at
FROM deals_old;

DROP TABLE deals_old;

PRAGMA foreign_keys=on;
`,
  },
  {
    name: "017_deal_status_history_fk_fix",
    sql: `
-- Ensure deal_status_history foreign key points at current deals table.
PRAGMA foreign_keys=off;

ALTER TABLE deal_status_history RENAME TO deal_status_history_old;

CREATE TABLE IF NOT EXISTS deal_status_history (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (to_status IN ('QUEUED','ASSIGNED','MAESTRO_APPROVED','PAID','IN_PROGRESS','DELIVERED','CLOSED','REFUNDED'))
);

INSERT INTO deal_status_history (
  id, deal_id, from_status, to_status, note, changed_by, changed_at
)
SELECT
  id, deal_id, from_status, to_status, note, changed_by, changed_at
FROM deal_status_history_old;

DROP TABLE deal_status_history_old;

PRAGMA foreign_keys=on;
`,
  },
  {
    name: "018_payments_stripe_core",
    sql: `
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  CHECK (provider IN ('STRIPE')),
  CHECK (status IN ('RECEIVED','PROCESSED','FAILED'))
);
`,
  },
  {
    name: "019_entitlements_discord_sync",
    sql: `
CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entitlement_key TEXT NOT NULL,
  status TEXT NOT NULL,
  granted_by TEXT,
  granted_at TEXT,
  revoked_by TEXT,
  revoked_at TEXT,
  reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, entitlement_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('GRANTED','REVOKED'))
);

CREATE TABLE IF NOT EXISTS user_discord_accounts (
  user_id TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`,
  },
  {
    name: "019_deal_payments_stripe_core",
    sql: `
CREATE TABLE IF NOT EXISTS deal_payments (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  checkout_session_id TEXT,
  payment_intent_id TEXT,
  status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, checkout_session_id),
  UNIQUE(provider, payment_intent_id),
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  CHECK (provider IN ('STRIPE')),
  CHECK (status IN ('CREATED','PAID','REFUNDED','FAILED'))
);
`,
  },
  {
    name: "020_ledger_entries_core",
    sql: `
CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  beneficiary_user_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  approved_at TEXT,
  paid_at TEXT,
  approved_by_user_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (beneficiary_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (entry_type IN ('PROVIDER_PAYOUT','REFERRER_COMMISSION','PLATFORM_REVENUE')),
  CHECK (status IN ('EARNED','APPROVED','PAID','VOID'))
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_status ON ledger_entries(status);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_deal_id ON ledger_entries(deal_id);
`,
  },
  {
    name: "021_newsletter_subscribers_sending",
    sql: `
ALTER TABLE newsletter_issues ADD COLUMN scheduled_for TEXT;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  unsubscribe_seed TEXT NOT NULL,
  unsubscribed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (status IN ('ACTIVE','UNSUBSCRIBED'))
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);

CREATE TABLE IF NOT EXISTS newsletter_send_runs (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  sent_at TEXT,
  attempted_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  bounced_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES newsletter_issues(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_newsletter_send_runs_issue_id ON newsletter_send_runs(issue_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_send_runs_due ON newsletter_send_runs(sent_at, scheduled_for);
CREATE UNIQUE INDEX IF NOT EXISTS ux_newsletter_send_runs_issue_pending ON newsletter_send_runs(issue_id) WHERE sent_at IS NULL;

CREATE TABLE IF NOT EXISTS newsletter_delivery_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES newsletter_send_runs(id) ON DELETE CASCADE,
  CHECK (event_type IN ('DELIVERED','BOUNCED','COMPLAINT'))
);

CREATE INDEX IF NOT EXISTS idx_newsletter_delivery_events_run_id ON newsletter_delivery_events(run_id);
`,
  },
  {
    name: "022_measurement_events",
    sql: `
CREATE TABLE IF NOT EXISTS measurement_events (
  id TEXT PRIMARY KEY,
  event_key TEXT NOT NULL,
  path TEXT NOT NULL,
  actor_user_id TEXT,
  anonymous_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_measurement_events_key_time ON measurement_events(event_key, created_at);
CREATE INDEX IF NOT EXISTS idx_measurement_events_time ON measurement_events(created_at);
CREATE INDEX IF NOT EXISTS idx_measurement_events_path_time ON measurement_events(path, created_at);
`,
  },
  {
    name: "023_stripe_connect_onboarding_payouts",
    sql: `
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  user_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  stripe_account_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  details_submitted INTEGER NOT NULL DEFAULT 0,
  charges_enabled INTEGER NOT NULL DEFAULT 0,
  payouts_enabled INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (provider IN ('STRIPE')),
  CHECK (status IN ('PENDING','COMPLETE'))
);

CREATE TABLE IF NOT EXISTS stripe_payout_executions (
  ledger_entry_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  stripe_transfer_id TEXT,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempted_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (ledger_entry_id) REFERENCES ledger_entries(id) ON DELETE CASCADE,
  UNIQUE(provider, idempotency_key),
  CHECK (provider IN ('STRIPE')),
  CHECK (status IN ('PENDING','SUCCEEDED','FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_status ON stripe_connect_accounts(status);
CREATE INDEX IF NOT EXISTS idx_stripe_payout_executions_status ON stripe_payout_executions(status);
`,
  },
  {
    name: "024_job_queue",
    sql: `
CREATE TABLE IF NOT EXISTS job_queue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  run_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  failed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_job_queue_status_run_at ON job_queue(status, run_at);
CREATE INDEX IF NOT EXISTS idx_job_queue_type ON job_queue(type);
`,
  },
  {
    name: "025_session_metadata",
    sql: `
-- Ensure the auth sessions table exists before altering.
-- On fresh DBs, ensureAuthSchema may not have run yet.
CREATE TABLE IF NOT EXISTS api_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT
);
ALTER TABLE api_sessions ADD COLUMN ip_address TEXT;
ALTER TABLE api_sessions ADD COLUMN user_agent TEXT;
`,
  },
  {
    name: "026_file_uploads",
    sql: `
ALTER TABLE events ADD COLUMN image_url TEXT;
ALTER TABLE apprentice_profiles ADD COLUMN avatar_url TEXT;

CREATE TABLE IF NOT EXISTS file_attachments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_key TEXT NOT NULL,
  file_url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
`,
  },
  {
    name: "027_performance_indexes",
    sql: `
-- Composite index for event list queries filtered by status + ordered by start time
CREATE INDEX IF NOT EXISTS idx_events_status_start ON events(status, start_at);
-- Composite index for registration queries by event + status
CREATE INDEX IF NOT EXISTS idx_registrations_event_status ON event_registrations(event_id, status);
-- Index for user lookup by email (auth queries)
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
-- Index for offer list filtered by status
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
-- Index for audit log by action + timestamp
CREATE INDEX IF NOT EXISTS idx_audit_log_action_time ON audit_log(action, created_at);
-- Index for audit log by actor
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id, created_at);
`,
  },
  {
    name: "028_event_description_metadata",
    sql: `
ALTER TABLE events ADD COLUMN description TEXT;
ALTER TABLE events ADD COLUMN metadata_json TEXT;
`,
  },
  {
    name: "029_apprentice_learning_paths",
    sql: `
-- Apprentice level definitions
CREATE TABLE IF NOT EXISTS apprentice_levels (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  description TEXT,
  min_gate_projects INTEGER NOT NULL DEFAULT 0,
  min_vocabulary INTEGER NOT NULL DEFAULT 0,
  human_edge_focus TEXT,
  salary_range TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Gate project definitions
CREATE TABLE IF NOT EXISTS gate_projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  level_slug TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  summary TEXT,
  acceptance_criteria_json TEXT,
  rubric_json TEXT,
  estimated_hours INTEGER,
  artifact_description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (level_slug) REFERENCES apprentice_levels(slug)
);

-- Apprentice gate project submissions
CREATE TABLE IF NOT EXISTS apprentice_gate_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  gate_project_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'PASSED', 'REVISION_NEEDED')),
  submission_url TEXT,
  submission_notes TEXT,
  reviewer_id TEXT,
  reviewer_notes TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (gate_project_id) REFERENCES gate_projects(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

-- Apprentice Spell Book vocabulary tracking
CREATE TABLE IF NOT EXISTS apprentice_vocabulary (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  term_slug TEXT NOT NULL,
  term_name TEXT NOT NULL,
  demonstrated_at TEXT NOT NULL,
  context TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, term_slug)
);

-- Add current_level to apprentice_profiles
ALTER TABLE apprentice_profiles ADD COLUMN current_level TEXT DEFAULT 'apprentice';

CREATE INDEX IF NOT EXISTS idx_gate_submissions_user ON apprentice_gate_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_gate_submissions_project ON apprentice_gate_submissions(gate_project_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_user ON apprentice_vocabulary(user_id);
`,
  },
  {
    name: "026_mcp_ingestion_contracts",
    sql: `
CREATE TABLE IF NOT EXISTS ingested_items (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  raw_payload TEXT NOT NULL,
  normalized_payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source_type, external_id)
);

CREATE TABLE IF NOT EXISTS newsletter_issue_ingested_items (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  ingested_item_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(issue_id, ingested_item_id, tag),
  FOREIGN KEY (issue_id) REFERENCES newsletter_issues(id) ON DELETE CASCADE,
  FOREIGN KEY (ingested_item_id) REFERENCES ingested_items(id) ON DELETE CASCADE,
  CHECK (tag IN ('MODELS','MONEY','PEOPLE','FROM_FIELD'))
);
`,
  },
  {
    name: "027_user_profiles",
    sql: `
ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
`,
  },
  {
    name: "028_action_proposals",
    sql: `
CREATE TABLE IF NOT EXISTS action_proposals (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  preconditions TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  proposed_by TEXT,
  proposed_at TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  rationale TEXT,
  FOREIGN KEY (proposed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (risk_level IN ('LOW','MEDIUM','HIGH')),
  CHECK (status IN ('PENDING','APPROVED','DENIED','EXPIRED'))
);
`,
  },
  {
    name: "029_role_requests",
    sql: `
CREATE TABLE IF NOT EXISTS role_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  requested_role_id TEXT NOT NULL,
  status TEXT NOT NULL,
  context TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);
`,
  },
  {
    name: "030_triage_tickets",
    sql: `
CREATE TABLE IF NOT EXISTS triage_tickets (
  id TEXT PRIMARY KEY,
  intake_request_id TEXT NOT NULL,
  category TEXT NOT NULL,
  confidence REAL NOT NULL,
  summary TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_override_category TEXT,
  admin_override_reason TEXT,
  overridden_by TEXT,
  overridden_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (intake_request_id) REFERENCES intake_requests(id) ON DELETE CASCADE,
  CHECK (category IN ('billing_support','technical_issue','general_inquiry','feature_request','partnership','urgent_escalation','spam')),
  CHECK (priority IN ('low','medium','high','urgent')),
  CHECK (status IN ('pending','triaged','auto_responded','escalated','resolved','closed'))
);
CREATE INDEX IF NOT EXISTS idx_triage_tickets_intake ON triage_tickets(intake_request_id);
CREATE INDEX IF NOT EXISTS idx_triage_tickets_status ON triage_tickets(status);
CREATE INDEX IF NOT EXISTS idx_triage_tickets_category ON triage_tickets(category);
`,
  },
  {
    name: "031_update_gate_projects",
    sql: `
-- Update gate projects to reflect the new polymath/inquiry philosophy
UPDATE gate_projects SET 
  title = 'Gate 2: Anatomy & Physics',
  slug = 'gate-02-anatomy-physics',
  summary = 'Build a simulation or visualization that models a physical or biological system. Prove you can translate domain rules from outside software into working code.',
  acceptance_criteria_json = '["System models a real-world physical or biological process", "Domain rules are explicitly documented before coding", "AI used to generate the simulation logic based on your rules", "Visual output accurately reflects the domain constraints"]',
  rubric_json = '{"domain_accuracy": "Does the model respect the rules of the physical/biological system?", "translation": "Are the domain rules clearly translated into software constraints?", "orchestration": "Did you successfully direct the AI to build the simulation?"}',
  artifact_description = 'Working simulation + Domain Rules Document'
WHERE slug = 'gate-02-audit-trail';

UPDATE gate_projects SET 
  title = 'Gate 4: Humanities & Computation',
  slug = 'gate-04-humanities-computation',
  summary = 'Apply computational methods to a problem in the humanities (history, literature, art). Demonstrate that you can operate across entirely different disciplines.',
  acceptance_criteria_json = '["Project addresses a specific question in a humanities discipline", "Uses data analysis, NLP, or computer vision on a non-technical dataset", "Epistemic boundary clearly stated: what the computation cannot capture about the human element", "Findings presented in a format native to the chosen discipline"]',
  rubric_json = '{"cross_disciplinary": "Does the project respect the methods of the humanities discipline?", "technical_application": "Is the computational method appropriate for the question?", "boundaries": "Are the limitations of the technical approach acknowledged?"}',
  artifact_description = 'Humanities Analysis Report + Code Repository'
WHERE slug = 'gate-04-data-assumptions';
`,
  },
  {
    name: "032_engagements_core",
    sql: `
CREATE TABLE IF NOT EXISTS engagements (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL CHECK(type IN ('PROJECT_COMMISSION','MAESTRO_TRAINING')),
  client_name    TEXT,
  student_id     TEXT,
  project_type   TEXT,
  total_value    INTEGER,
  commission     INTEGER,
  referral_code  TEXT,
  track          TEXT CHECK(track IN ('cohort','advisory')),
  cohort_start   TEXT,
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(payment_status IN ('PENDING','RECEIVED','REFUNDED')),
  status         TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','COMPLETED','CANCELLED')),
  notes          TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);
CREATE INDEX IF NOT EXISTS idx_engagements_referral_code ON engagements(referral_code);
`,
  },
  {
    name: "033_ledger_entries_engagement_fk",
    sql: `
-- Make deal_id nullable and add engagement_id FK so admin engagements
-- can create ledger entries without requiring a marketplace deal record.
-- Also rebuilds stripe_payout_executions to restore its FK reference after
-- the ledger_entries rename.
PRAGMA foreign_keys=off;

ALTER TABLE ledger_entries RENAME TO ledger_entries_old;

CREATE TABLE IF NOT EXISTS ledger_entries (
  id                   TEXT PRIMARY KEY,
  deal_id              TEXT,
  engagement_id        TEXT,
  entry_type           TEXT NOT NULL,
  beneficiary_user_id  TEXT,
  amount_cents         INTEGER NOT NULL,
  currency             TEXT NOT NULL,
  status               TEXT NOT NULL,
  earned_at            TEXT NOT NULL,
  approved_at          TEXT,
  paid_at              TEXT,
  approved_by_user_id  TEXT,
  metadata_json        TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE,
  FOREIGN KEY (beneficiary_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (entry_type IN ('PROVIDER_PAYOUT','REFERRER_COMMISSION','PLATFORM_REVENUE')),
  CHECK (status IN ('EARNED','APPROVED','PAID','VOID'))
);

INSERT INTO ledger_entries (
  id, deal_id, entry_type, beneficiary_user_id, amount_cents, currency,
  status, earned_at, approved_at, paid_at, approved_by_user_id, metadata_json,
  created_at, updated_at
)
SELECT
  id, deal_id, entry_type, beneficiary_user_id, amount_cents, currency,
  status, earned_at, approved_at, paid_at, approved_by_user_id, metadata_json,
  created_at, updated_at
FROM ledger_entries_old;

DROP TABLE ledger_entries_old;

-- Rebuild stripe_payout_executions so its FK points to the new ledger_entries
-- (SQLite auto-rename tracking would have pointed it to the dropped table).
ALTER TABLE stripe_payout_executions RENAME TO stripe_payout_executions_old;

CREATE TABLE IF NOT EXISTS stripe_payout_executions (
  ledger_entry_id  TEXT PRIMARY KEY,
  provider         TEXT NOT NULL,
  idempotency_key  TEXT NOT NULL,
  stripe_transfer_id TEXT,
  status           TEXT NOT NULL,
  attempt_count    INTEGER NOT NULL DEFAULT 0,
  last_attempted_at TEXT,
  last_error       TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  FOREIGN KEY (ledger_entry_id) REFERENCES ledger_entries(id) ON DELETE CASCADE,
  UNIQUE(provider, idempotency_key),
  CHECK (provider IN ('STRIPE')),
  CHECK (status IN ('PENDING','SUCCEEDED','FAILED'))
);

INSERT INTO stripe_payout_executions (
  ledger_entry_id, provider, idempotency_key, stripe_transfer_id, status,
  attempt_count, last_attempted_at, last_error, created_at, updated_at
)
SELECT
  ledger_entry_id, provider, idempotency_key, stripe_transfer_id, status,
  attempt_count, last_attempted_at, last_error, created_at, updated_at
FROM stripe_payout_executions_old;

DROP TABLE stripe_payout_executions_old;

CREATE INDEX IF NOT EXISTS idx_ledger_entries_status ON ledger_entries(status);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_deal_id ON ledger_entries(deal_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_engagement_id ON ledger_entries(engagement_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_status ON stripe_connect_accounts(status);
CREATE INDEX IF NOT EXISTS idx_stripe_payout_executions_status ON stripe_payout_executions(status);

PRAGMA foreign_keys=on;
`,
  },
  {
    name: "034_feed_events_core",
    sql: `
CREATE TABLE IF NOT EXISTS feed_events (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  action_url  TEXT,
  created_at  TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_feed_events_user_id ON feed_events(user_id);
`,
  },
  {
    name: "035_payout_tax_info",
    sql: `
CREATE TABLE IF NOT EXISTS payout_tax_info (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL UNIQUE,
  legal_name   TEXT NOT NULL,
  entity_type  TEXT NOT NULL CHECK(entity_type IN ('INDIVIDUAL','LLC','S_CORP','C_CORP')),
  address_line1 TEXT NOT NULL,
  city         TEXT NOT NULL,
  state        TEXT NOT NULL,
  postal_code  TEXT NOT NULL,
  country      TEXT NOT NULL DEFAULT 'US',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`,
  },
  {
    name: "036_site_settings",
    sql: `
CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('contact.phone',                  '+1 (000) 000-0000'),
  ('contact.email',                  'hello@studioordo.com'),
  ('contact.booking_url',            'https://cal.com/studioordo'),
  ('brand.name',                     'Studio Ordo'),
  ('brand.tagline',                  'Bring order to AI in software delivery.'),
  ('commission.rate_pct',            '20'),
  ('guild.affiliate_min_payout_usd', '50');
`,
  },
  {
    name: "037_intake_agent_tables",
    sql: `
CREATE TABLE IF NOT EXISTS intake_conversations (
  id                TEXT PRIMARY KEY,
  session_id        TEXT NOT NULL,
  intake_request_id TEXT,
  messages          TEXT NOT NULL DEFAULT '[]',
  status            TEXT NOT NULL CHECK (status IN ('ACTIVE','COMPLETED','ABANDONED'))
                    DEFAULT 'ACTIVE',
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (intake_request_id) REFERENCES intake_requests(id)
);

CREATE TABLE IF NOT EXISTS maestro_availability (
  id              TEXT PRIMARY KEY,
  maestro_user_id TEXT NOT NULL,
  start_at        TEXT NOT NULL,
  end_at          TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('OPEN','BOOKED','BLOCKED'))
                  DEFAULT 'OPEN',
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (maestro_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id                      TEXT PRIMARY KEY,
  intake_request_id       TEXT NOT NULL,
  maestro_availability_id TEXT NOT NULL,
  prospect_email          TEXT NOT NULL,
  status                  TEXT NOT NULL CHECK (status IN ('PENDING','CONFIRMED','CANCELLED'))
                          DEFAULT 'PENDING',
  created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (intake_request_id)       REFERENCES intake_requests(id),
  FOREIGN KEY (maestro_availability_id) REFERENCES maestro_availability(id)
);
`,
  },
  {
    name: "038_contacts_crm",
    sql: `
CREATE TABLE IF NOT EXISTS contacts (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  user_id     TEXT,
  source      TEXT NOT NULL DEFAULT 'AGENT'
              CHECK (source IN ('AGENT','FORM','REFERRAL','MANUAL')),
  status      TEXT NOT NULL DEFAULT 'LEAD'
              CHECK (status IN ('LEAD','QUALIFIED','ONBOARDING','ACTIVE','CHURNED')),
  notes       TEXT,
  assigned_to TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id)     REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

ALTER TABLE intake_requests ADD COLUMN contact_id TEXT REFERENCES contacts(id);
`,
  },
  {
    name: "039_onboarding_workflow",
    sql: `
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  role        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  required    INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO onboarding_tasks (id, slug, title, description, role, position, required) VALUES
  ('ot-profile-complete',     'profile.complete',          'Complete your profile',            'Add your bio, photo, and contact details.',              'all',        1, 1),
  ('ot-affiliate-card',       'affiliate.card-order',      'Order your QR business card',      'Order your branded QR card via the studio portal.',     'affiliate',  2, 1),
  ('ot-affiliate-stripe',     'affiliate.stripe-setup',    'Set up payout account',            'Connect Stripe to receive commission payouts.',          'affiliate',  3, 1),
  ('ot-apprentice-intro',     'apprentice.intro-call',     'Schedule intro call with Maestro', 'Book your onboarding call with your assigned Maestro.', 'apprentice', 2, 1),
  ('ot-apprentice-survey',    'apprentice.skills-survey',  'Complete skills survey',           'Tell us about your current skills and learning goals.',  'apprentice', 3, 1);

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  task_id      TEXT NOT NULL,
  completed    INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (user_id, task_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (task_id) REFERENCES onboarding_tasks(id)
);
`,
  },
  {
    name: "040_workflow_engine",
    sql: `
CREATE TABLE IF NOT EXISTS workflow_rules (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  trigger_event  TEXT NOT NULL,
  condition_json TEXT,
  action_type    TEXT NOT NULL CHECK(action_type IN (
                   'UPDATE_CONTACT_STATUS',
                   'ASSIGN_TO_STAFF',
                   'SEND_EMAIL',
                   'CREATE_FEED_EVENT'
                 )),
  action_config  TEXT NOT NULL,
  enabled        INTEGER NOT NULL DEFAULT 1,
  position       INTEGER NOT NULL DEFAULT 0,
  created_by     TEXT NOT NULL DEFAULT 'system',
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT OR IGNORE INTO workflow_rules
  (id, name, description, trigger_event, condition_json, action_type, action_config, enabled, position) VALUES
  ('wf-intake-assign',
   'Auto-assign intake to first staff',
   'Assigns the intake contact to a default staff member on submission.',
   'TriageTicket',
   NULL,
   'ASSIGN_TO_STAFF',
   '{"staff_user_id":"system"}',
   0, 1),
  ('wf-intake-email',
   'Send intake confirmation email',
   'Sends a confirmation email to the contact on intake submission.',
   'TriageTicket',
   NULL,
   'SEND_EMAIL',
   '{"template":"intake_received","to":"contact"}',
   0, 2),
  ('wf-qualify-on-approval',
   'Mark contact QUALIFIED on role request approval',
   'Advances contact lifecycle to QUALIFIED when a role request is approved.',
   'RoleRequestUpdate',
   '{"field":"payload.status","operator":"eq","value":"APPROVED"}',
   'UPDATE_CONTACT_STATUS',
   '{"to_status":"QUALIFIED"}',
   0, 3),
  ('wf-followup-3day',
   '3-day follow-up if no booking',
   'Creates a follow-up action 72 hours after intake submission.',
   'TriageTicket',
   NULL,
   'CREATE_FEED_EVENT',
   '{"type":"FollowUpAction","title":"Follow-up due","description":"Intake submitted 3 days ago — no response yet.","delay_hours":72}',
   0, 4),
  ('wf-welcome-provision',
   'Welcome email on account provision',
   'Sends a welcome email when a new account is provisioned via the onboarding workflow.',
   'OnboardingProgress',
   '{"field":"payload.title","operator":"eq","value":"Account provisioned"}',
   'SEND_EMAIL',
   '{"template":"welcome","to":"contact"}',
   0, 5);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id            TEXT PRIMARY KEY,
  rule_id       TEXT NOT NULL,
  feed_event_id TEXT NOT NULL,
  status        TEXT NOT NULL CHECK(status IN ('SUCCESS','FAILED','SKIPPED')),
  error         TEXT,
  executed_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (rule_id)       REFERENCES workflow_rules(id),
  FOREIGN KEY (feed_event_id) REFERENCES feed_events(id)
);
`,
  },
  {
    name: "041_governance_policy_rails",
    sql: `
/* ---- Extend referral_conversions to track deal-paid events ---- */
CREATE TABLE IF NOT EXISTS referral_conversions_v2 (
  id                TEXT PRIMARY KEY,
  referral_code_id  TEXT NOT NULL,
  conversion_type   TEXT NOT NULL,
  intake_request_id TEXT,
  deal_id           TEXT,
  created_at        TEXT NOT NULL,
  FOREIGN KEY (referral_code_id)  REFERENCES referral_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (intake_request_id) REFERENCES intake_requests(id) ON DELETE SET NULL,
  FOREIGN KEY (deal_id)           REFERENCES deals(id) ON DELETE SET NULL,
  CHECK (conversion_type IN ('INTAKE_REQUEST', 'DEAL_PAID'))
);
INSERT OR IGNORE INTO referral_conversions_v2
  (id, referral_code_id, conversion_type, intake_request_id, created_at)
  SELECT id, referral_code_id, conversion_type, intake_request_id, created_at
  FROM referral_conversions;
DROP TABLE referral_conversions;
ALTER TABLE referral_conversions_v2 RENAME TO referral_conversions;
`,
  },
  {
    name: "042_ledger_unique_deal_entry_type",
    sql: `
-- Prevent duplicate ledger entries for the same (deal, entry_type) pair.
-- Guards against TOCTOU races on concurrent webhook delivery.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_deal_entry_type
  ON ledger_entries(deal_id, entry_type)
  WHERE deal_id IS NOT NULL;
`,
  },
  {
    name: "043_deal_payments_unique_created",
    sql: `
-- Prevent concurrent checkout creation for the same deal.
-- Allows at most one CREATED payment per deal at any time.
-- PAID and REFUNDED records are exempt so history is preserved.
CREATE UNIQUE INDEX IF NOT EXISTS uq_deal_payments_created
  ON deal_payments(deal_id)
  WHERE status = 'CREATED';
`,
  },
  {
    name: "044_missing_roles_seed",
    sql: `
-- Seed roles that are referenced in business logic but were missing from the
-- initial roles seed. INSERT OR IGNORE makes this migration idempotent.
INSERT OR IGNORE INTO roles (id, name) VALUES
  ('role_associate',            'ASSOCIATE'),
  ('role_certified_consultant', 'CERTIFIED_CONSULTANT'),
  ('role_staff',                'STAFF');
`,
  },
  {
    name: "045_embeddings",
    sql: `
CREATE TABLE IF NOT EXISTS embeddings (
  id            TEXT PRIMARY KEY,
  corpus        TEXT NOT NULL,
  source_id     TEXT NOT NULL,
  chunk_index   INTEGER NOT NULL DEFAULT 0,
  chunk_text    TEXT NOT NULL,
  visibility    TEXT NOT NULL DEFAULT 'PUBLIC',
  user_id       TEXT,
  embedding     BLOB NOT NULL,
  metadata_json TEXT,
  created_at    TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_embeddings_corpus_source ON embeddings(corpus, source_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_user ON embeddings(user_id, corpus);
CREATE UNIQUE INDEX IF NOT EXISTS idx_embeddings_source_chunk ON embeddings(source_id, chunk_index);
`,
  },
  {
    name: "046_search_analytics",
    sql: `
CREATE TABLE IF NOT EXISTS search_analytics (
  id           TEXT PRIMARY KEY,
  query        TEXT NOT NULL,
  corpus       TEXT NOT NULL DEFAULT 'content',
  result_count INTEGER NOT NULL DEFAULT 0,
  top_source   TEXT,
  top_score    REAL,
  user_id      TEXT,
  session_id   TEXT,
  source       TEXT NOT NULL DEFAULT 'intake-agent',
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON search_analytics(created_at);
`,
  },
];

const ensureMetaTable = (db: Database.Database): void => {
  db.exec(`
CREATE TABLE IF NOT EXISTS app_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`);
};

const openDb = (config: AppConfig, enforcePragmas = true): Database.Database => {
  const dbPath = resolve(config.db.file);
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  if (enforcePragmas) {
    db.pragma(`busy_timeout = ${config.db.busyTimeoutMs}`);
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
  }
  return db;
};

const getAppliedMigrationNames = (db: Database.Database): string[] => {
  const hasMeta = db
    .prepare("SELECT COUNT(1) AS count FROM sqlite_master WHERE type = 'table' AND name = 'app_migrations'")
    .get() as { count: number };

  if (hasMeta.count === 0) {
    return [];
  }

  const rows = db.prepare("SELECT name FROM app_migrations ORDER BY applied_at ASC").all() as {
    name: string;
  }[];
  return rows.map((row) => row.name);
};

const appendAudit = (
  db: Database.Database,
  action: string,
  requestId: string,
  metadata?: Record<string, unknown>,
): void => {
  db.prepare(
    `
INSERT INTO audit_log (
  id,
  actor_type,
  actor_id,
  action,
  target_type,
  target_id,
  metadata,
  created_at,
  request_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
  ).run(
    randomUUID(),
    "SERVICE",
    null,
    action,
    "system",
    null,
    metadata ? JSON.stringify(metadata) : null,
    new Date().toISOString(),
    requestId,
  );
};

export interface DbStatus {
  currentMigration: string | null;
  pendingCount: number;
  appliedCount: number;
  pendingMigrations: string[];
}

const statusFromDb = (db: Database.Database): DbStatus => {
  const applied = getAppliedMigrationNames(db);
  const pending = migrations.filter((migration) => !applied.includes(migration.name));

  return {
    currentMigration: applied.length > 0 ? applied[applied.length - 1] : null,
    pendingCount: pending.length,
    appliedCount: applied.length,
    pendingMigrations: pending.map((migration) => migration.name),
  };
};

export const dbStatus = (config: AppConfig): DbStatus => {
  const db = openDb(config);
  try {
    return statusFromDb(db);
  } finally {
    db.close();
  }
};

export interface MigrateResult {
  applied: string[];
  pendingBefore: number;
}

export const dbMigrate = (config: AppConfig, requestId: string): MigrateResult => {
  const db = openDb(config);
  try {
    ensureMetaTable(db);
    const applied = getAppliedMigrationNames(db);
    const pending = migrations.filter((migration) => !applied.includes(migration.name));

    const run = db.transaction(() => {
      for (const migration of pending) {
        db.exec(migration.sql);
        db.prepare("INSERT INTO app_migrations (name, applied_at) VALUES (?, ?)").run(
          migration.name,
          new Date().toISOString(),
        );
      }

      appendAudit(db, "db.migrate", requestId, {
        appliedCount: pending.length,
        migrations: pending.map((migration) => migration.name),
      });
    });

    run();

    return {
      applied: pending.map((migration) => migration.name),
      pendingBefore: pending.length,
    };
  } finally {
    db.close();
  }
};

const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const resolveActiveToken = (config: AppConfig, token: string): { id: string } | undefined => {
  const db = openDb(config);
  try {
    const tokenHash = hashToken(token);
    return db
      .prepare("SELECT id FROM service_tokens WHERE token_hash = ? AND revoked_at IS NULL")
      .get(tokenHash) as { id: string } | undefined;
  } finally {
    db.close();
  }
};

const requireDangerousProdGuard = (args: {
  config: AppConfig;
  operation: string;
  forceProd?: boolean;
  yes?: boolean;
  token?: string;
}): void => {
  if (args.config.env !== "prod") {
    return;
  }

  if (!args.forceProd || !args.yes) {
    throw preconditionError(
      `${args.operation} in prod requires both --force-prod and --yes.`,
    );
  }

  if (!args.token) {
    throw authError(`A valid token is required for ${args.operation} in prod.`);
  }

  const token = resolveActiveToken(args.config, args.token);
  if (!token) {
    throw authError(`Invalid or revoked token for ${args.operation} in prod.`);
  }
};

export interface DbBackupResult {
  out: string;
  env: RuntimeEnv;
}

export const dbBackup = async (
  config: AppConfig,
  requestId: string,
  out: string,
  options?: {
    forceProd?: boolean;
    yes?: boolean;
    token?: string;
  },
): Promise<DbBackupResult> => {
  const status = dbStatus(config);
  if (status.pendingCount > 0) {
    throw preconditionError("Migrations are pending. Run `appctl db migrate` first.");
  }

  requireDangerousProdGuard({
    config,
    operation: "db backup",
    forceProd: options?.forceProd,
    yes: options?.yes,
    token: options?.token,
  });

  const outputPath = resolve(out);
  mkdirSync(dirname(outputPath), { recursive: true });

  const db = openDb(config);
  try {
    await db.backup(outputPath);

    appendAudit(db, "db.backup", requestId, {
      out: outputPath,
      env: config.env,
    });

    return {
      out: outputPath,
      env: config.env,
    };
  } finally {
    db.close();
  }
};

export interface DbRestoreResult {
  from: string;
  target: string;
  env: RuntimeEnv;
}

export const dbRestore = async (
  config: AppConfig,
  requestId: string,
  from: string,
  options?: {
    forceProd?: boolean;
    yes?: boolean;
    token?: string;
  },
): Promise<DbRestoreResult> => {
  if (!options?.yes) {
    throw preconditionError("db restore requires --yes confirmation.");
  }

  requireDangerousProdGuard({
    config,
    operation: "db restore",
    forceProd: options?.forceProd,
    yes: options?.yes,
    token: options?.token,
  });

  const sourcePath = resolve(from);
  if (!existsSync(sourcePath)) {
    throw preconditionError(`Backup file not found: ${sourcePath}`);
  }

  const targetPath = resolve(config.db.file);
  mkdirSync(dirname(targetPath), { recursive: true });

  const sourceDb = new Database(sourcePath, {
    readonly: true,
    fileMustExist: true,
  });

  try {
    await sourceDb.backup(targetPath);
  } finally {
    sourceDb.close();
  }

  const restoredDb = openDb(config);
  try {
    appendAudit(restoredDb, "db.restore", requestId, {
      from: sourcePath,
      target: targetPath,
      env: config.env,
    });
  } finally {
    restoredDb.close();
  }

  return {
    from: sourcePath,
    target: targetPath,
    env: config.env,
  };
};

/* ---------- Studio Ordo seed fixture ---------- */

interface StudioOrdoOffer {
  slug: string;
  title: string;
  summary: string;
  priceCents: number;
  currency: string;
  durationLabel: string;
  refundPolicyKey: string;
  audience: string;
  deliveryMode: string;
  bookingUrl: string;
  outcomes: string[];
}

interface StudioOrdoEvent {
  slug: string;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  capacity: number;
  description: string;
  metadataJson: string;
}

const studioOrdoOffers: StudioOrdoOffer[] = [
  {
    slug: "workshop-disciplined-inquiry",
    title: "What Belongs to You — Disciplined Inquiry Workshop",
    summary:
      "Half-day hands-on workshop on Disciplined Inquiry. Learn to write specs before code, define Context Packs, and build the foundation for AI-assisted development. Human Edge capability: Disciplined Inquiry.",
    priceCents: 250000,
    currency: "USD",
    durationLabel: "Half-day (4 hours)",
    refundPolicyKey: "standard",
    audience: "BOTH",
    deliveryMode: "HYBRID",
    bookingUrl: "/services#workshop-disciplined-inquiry",
    outcomes: [
      "First Context Pack (v1)",
      "Spell Book terms: Context Pack, Disciplined Inquiry, Spec-Driven Development, Acceptance Criteria, 40/60 Ratio, Human Edge, Spell Book, Gate Project",
      "Human Edge capability: Disciplined Inquiry",
    ],
  },
  {
    slug: "workshop-professional-judgment",
    title: "The Audit Trail — Professional Judgment Workshop",
    summary:
      "Half-day hands-on workshop on Professional Judgment. Build your first AI Audit Log, practice accept/reject/modify decisions, and develop the judgment to evaluate AI output. Human Edge capability: Professional Judgment.",
    priceCents: 250000,
    currency: "USD",
    durationLabel: "Half-day (4 hours)",
    refundPolicyKey: "standard",
    audience: "BOTH",
    deliveryMode: "HYBRID",
    bookingUrl: "/services#workshop-professional-judgment",
    outcomes: [
      "AI Audit Log with 10+ documented decisions",
      "Spell Book terms: AI Audit Log, Professional Judgment, Prompt Engineering, Evidence-Backed Claim, Evaluation Criteria, CLAIMS.md, Named Expert Critique, Autodidactic Loop",
      "Human Edge capability: Professional Judgment",
    ],
  },
  {
    slug: "workshop-resilience-thinking",
    title: "Build for the Break — Resilience Thinking Workshop",
    summary:
      "Full-day intensive on Resilience Thinking. Write Failure Mode Analyses, run incident drills, and design systems that fail gracefully. Human Edge capability: Resilience Thinking.",
    priceCents: 450000,
    currency: "USD",
    durationLabel: "Full-day (8 hours)",
    refundPolicyKey: "standard",
    audience: "BOTH",
    deliveryMode: "HYBRID",
    bookingUrl: "/services#workshop-resilience-thinking",
    outcomes: [
      "Failure Mode Analysis document",
      "Incident drill experience",
      "Spell Book terms: Failure Mode Analysis, Incident Drill, Defense-in-Depth, Error Budget, Resilience Thinking, 12-Factor + AI, Blameless Postmortem, Assumptions Log",
      "Human Edge capability: Resilience Thinking",
    ],
  },
  {
    slug: "workshop-problem-finding",
    title: "Finding the Real Problem — Problem Finding Workshop",
    summary:
      "Half-day workshop on Problem Finding. Distinguish stated problems from real problems, practice systematic problem decomposition, and build investigation skills. Human Edge capability: Problem Finding.",
    priceCents: 250000,
    currency: "USD",
    durationLabel: "Half-day (4 hours)",
    refundPolicyKey: "standard",
    audience: "BOTH",
    deliveryMode: "HYBRID",
    bookingUrl: "/services#workshop-problem-finding",
    outcomes: [
      "Problem Decomposition document",
      "Spell Book terms: Problem Finding, Problem Decomposition, Autodidactic Loop, CURATOR_NOTES, AGENTS.md, PROMPT_LOG, Named Expert Critique, Evidence-Backed Claim",
      "Human Edge capability: Problem Finding",
    ],
  },
  {
    slug: "workshop-epistemic-humility",
    title: "What Your Data Cannot Say — Epistemic Humility Workshop",
    summary:
      "Half-day workshop on Epistemic Humility. Document data assumptions, evaluate RAG failure modes, and learn to articulate what your models cannot represent. Human Edge capability: Epistemic Humility.",
    priceCents: 250000,
    currency: "USD",
    durationLabel: "Half-day (4 hours)",
    refundPolicyKey: "standard",
    audience: "BOTH",
    deliveryMode: "HYBRID",
    bookingUrl: "/services#workshop-epistemic-humility",
    outcomes: [
      "Data Assumptions Document",
      "Spell Book terms: Epistemic Humility, Data Assumptions Document, Hybrid Data Stack, RAG, Benchmark Saturation, Human-in-the-Loop, Deployment Gap, Evaluation Criteria",
      "Human Edge capability: Epistemic Humility",
    ],
  },
  {
    slug: "workshop-systems-thinking",
    title: "The Orchestration Workshop — Systems Thinking",
    summary:
      "Full-day intensive on Systems Thinking. Design agentic workflows, implement orchestration patterns, and learn to see how parts interact in complex systems. Human Edge capability: Systems Thinking.",
    priceCents: 450000,
    currency: "USD",
    durationLabel: "Full-day (8 hours)",
    refundPolicyKey: "standard",
    audience: "BOTH",
    deliveryMode: "HYBRID",
    bookingUrl: "/services#workshop-systems-thinking",
    outcomes: [
      "Agentic Workflow design",
      "Spell Book terms: Systems Thinking, Orchestration, Command Pattern, Dependency Injection, SOLID, STRIDE Model, Defense-in-Depth, AGENT_HANDOFF.md",
      "Human Edge capability: Systems Thinking",
    ],
  },
  {
    slug: "workshop-accountable-leadership",
    title: "Ship & Present — Accountable Leadership Workshop",
    summary:
      "Half-day workshop on Accountable Leadership. Practice presenting and defending technical decisions, build Demo Day skills, and learn to put your name on shipped work. Human Edge capability: Accountable Leadership.",
    priceCents: 250000,
    currency: "USD",
    durationLabel: "Half-day (4 hours)",
    refundPolicyKey: "standard",
    audience: "BOTH",
    deliveryMode: "HYBRID",
    bookingUrl: "/services#workshop-accountable-leadership",
    outcomes: [
      "Demo Day recording",
      "Spell Book terms: Accountable Leadership, Demo Day, Spec-Driven Development, Context Pack, Ship & Present, Field Report, Do Not Bluff, Portfolio Artifact",
      "Human Edge capability: Accountable Leadership",
    ],
  },
  {
    slug: "workshop-translation",
    title: "Making AI Accessible — Translation Workshop",
    summary:
      "Half-day workshop on Translation. Apply the Feynman technique, manage cognitive load, and learn to make complex AI concepts accessible to any audience. Human Edge capability: Translation.",
    priceCents: 250000,
    currency: "USD",
    durationLabel: "Half-day (4 hours)",
    refundPolicyKey: "standard",
    audience: "BOTH",
    deliveryMode: "HYBRID",
    bookingUrl: "/services#workshop-translation",
    outcomes: [
      "Translation Brief",
      "Spell Book terms: Translation, Feynman Technique, Cognitive Load Theory, Translation Brief, Curse of Knowledge, Audience Analysis, Community Impact Report, Making Invisible Visible",
      "Human Edge capability: Translation",
    ],
  },
  {
    slug: "corporate-starter",
    title: "Corporate Starter Package",
    summary:
      "One half-day workshop from the Studio Ordo catalog, delivered at your location or virtually. Includes facilitator, materials, evaluation, Spell Book handout (8 terms), and Context Pack v1 template. Up to 15 participants.",
    priceCents: 200000,
    currency: "USD",
    durationLabel: "Half-day (4 hours)",
    refundPolicyKey: "standard",
    audience: "GROUP",
    deliveryMode: "HYBRID",
    bookingUrl: "/services#corporate-starter",
    outcomes: [
      "1 workshop from the 8-workshop catalog",
      "Spell Book handout (8 terms)",
      "Context Pack v1 template",
      "Certificate of completion",
      "Up to 15 participants",
    ],
  },
  {
    slug: "corporate-professional",
    title: "Corporate Professional Package",
    summary:
      "2-day intensive combining two workshops with pre/post Team Readiness Assessment, AI Audit Log training, 40/60 team practice session, custom domain exercises, and follow-up report. Up to 25 participants.",
    priceCents: 500000,
    currency: "USD",
    durationLabel: "2 days (16 hours)",
    refundPolicyKey: "standard",
    audience: "GROUP",
    deliveryMode: "HYBRID",
    bookingUrl: "/services#corporate-professional",
    outcomes: [
      "2 workshops from the catalog",
      "Pre/post Team Readiness Assessment",
      "AI Audit Log training session",
      "40/60 team practice session",
      "Custom domain exercises",
      "Follow-up report within 5 business days",
      "Spell Book handout (25 terms)",
      "Context Pack v2 template",
      "Up to 25 participants",
    ],
  },
  {
    slug: "corporate-enterprise",
    title: "Corporate Enterprise Package",
    summary:
      "4-week Team Program covering the full Human Edge framework. Four workshops, synthesis sessions, full Human Edge Assessment (pre/post), Demo Day format, and optional quarterly review. Up to 50 participants.",
    priceCents: 1000000,
    currency: "USD",
    durationLabel: "4 weeks (32 hours)",
    refundPolicyKey: "standard",
    audience: "GROUP",
    deliveryMode: "HYBRID",
    bookingUrl: "/services#corporate-enterprise",
    outcomes: [
      "4 workshops + 2 synthesis sessions",
      "Full Human Edge Assessment (pre/post, 32-point)",
      "Demo Day format with presentations",
      "AI Audit Log training + practice",
      "Multiple 40/60 team sessions",
      "Context Pack v3 template",
      "Individual capability profiles",
      "Follow-up report within 10 business days",
      "Spell Book handout (40+ terms)",
      "Up to 50 participants",
      "Optional quarterly review ($2,500/quarter)",
    ],
  },
  {
    slug: "everydayai-community",
    title: "EverydayAI Community Training",
    summary:
      "Free 4-week community AI training program. One evening per week, 2 hours each. Covers AI literacy, practical applications, security awareness, and personal AI toolkit. Open to all.",
    priceCents: 0,
    currency: "USD",
    durationLabel: "4 weeks (8 hours total)",
    refundPolicyKey: "none",
    audience: "BOTH",
    deliveryMode: "IN_PERSON",
    bookingUrl: "/services#everydayai-community",
    outcomes: [
      "AI Reality Check handout",
      "AI Task Finder worksheet",
      "AI Security Checklist",
      "Personal AI Toolkit card",
      "Community of practice connection",
      "Free — always",
    ],
  },
];

const studioOrdoEvents: StudioOrdoEvent[] = [
  {
    slug: "workshop-disciplined-inquiry-2026-09",
    title: "What Belongs to You — Disciplined Inquiry Workshop (Sep 2026)",
    startAt: "2026-09-15T13:00:00-04:00",
    endAt: "2026-09-15T17:00:00-04:00",
    timezone: "America/New_York",
    capacity: 20,
    description:
      "Half-day hands-on workshop on Disciplined Inquiry — the ability to ask the question that changes the project. Write your first Context Pack, practice spec-driven development with AI tools, and build the foundation for structured AI-assisted work.",
    metadataJson: JSON.stringify({
      capability: "Disciplined Inquiry",
      spellBookTerms: [
        "Context Pack",
        "Disciplined Inquiry",
        "Spec-Driven Development",
        "Acceptance Criteria",
        "40/60 Ratio",
        "Human Edge",
        "Spell Book",
        "Gate Project",
      ],
      artifacts: [
        "First Context Pack (v1)",
        "Spec-driven exercise output",
        "AI Audit Log entry",
      ],
      offerSlug: "workshop-disciplined-inquiry",
    }),
  },
  {
    slug: "workshop-resilience-thinking-2026-10",
    title: "Build for the Break — Resilience Thinking Workshop (Oct 2026)",
    startAt: "2026-10-08T09:00:00-04:00",
    endAt: "2026-10-08T17:00:00-04:00",
    timezone: "America/New_York",
    capacity: 20,
    description:
      "Full-day intensive on Resilience Thinking — designing systems that fail gracefully. Write a Failure Mode Analysis, run an incident drill, and learn to build for what breaks at 2 AM.",
    metadataJson: JSON.stringify({
      capability: "Resilience Thinking",
      spellBookTerms: [
        "Failure Mode Analysis",
        "Incident Drill",
        "Defense-in-Depth",
        "Error Budget",
        "Resilience Thinking",
        "12-Factor + AI",
        "Blameless Postmortem",
        "Assumptions Log",
      ],
      artifacts: [
        "Failure Mode Analysis document",
        "Incident drill debrief",
        "Resilience checklist",
      ],
      offerSlug: "workshop-resilience-thinking",
    }),
  },
  {
    slug: "town-hall-2026-09",
    title: "Studio Ordo Town Hall — The Year in AI: What Actually Happened",
    startAt: "2026-09-25T18:00:00-04:00",
    endAt: "2026-09-25T19:30:00-04:00",
    timezone: "America/New_York",
    capacity: 100,
    description:
      "Free monthly Town Hall. 20-minute data-driven presentation on the current state of AI capability, followed by 40 minutes of open Q&A. No jargon, no sales pitch, honest answers. This month: acceleration data, METR benchmarks, and what the $600B investment means for your team.",
    metadataJson: JSON.stringify({
      capability: null,
      spellBookTerms: [],
      artifacts: ["Recording published within 48 hours"],
      offerSlug: null,
      category: "COMMUNITY",
      recurring: "monthly",
    }),
  },
  {
    slug: "everydayai-2026-q4",
    title: "EverydayAI Newark — Q4 2026 Cohort",
    startAt: "2026-10-15T18:00:00-04:00",
    endAt: "2026-10-15T20:00:00-04:00",
    timezone: "America/New_York",
    capacity: 30,
    description:
      "Free 4-week community AI training program. Week 1: What AI Is and Isn't. Week 2: Using AI for Your Work. Week 3: Privacy, Security, and Evaluating AI. Week 4: Building Your AI Toolkit. Open to all Newark-area residents, business owners, nonprofit staff, teachers, and municipal employees.",
    metadataJson: JSON.stringify({
      capability: "Translation",
      spellBookTerms: [],
      artifacts: [
        "AI Reality Check handout",
        "AI Task Finder worksheet",
        "AI Security Checklist",
        "Personal AI Toolkit card",
      ],
      offerSlug: "everydayai-community",
      category: "COMMUNITY",
    }),
  },
  {
    slug: "town-hall-2026-10",
    title: "Studio Ordo Town Hall — When AI Gets It Wrong: Failure Modes",
    startAt: "2026-10-23T18:00:00-04:00",
    endAt: "2026-10-23T19:30:00-04:00",
    timezone: "America/New_York",
    capacity: 100,
    description:
      "Free monthly Town Hall. This month: real examples of AI failure modes, how to evaluate confidence, and when to override the machine. 20-minute data-driven presentation followed by open Q&A.",
    metadataJson: JSON.stringify({
      capability: null,
      spellBookTerms: [],
      artifacts: ["Recording published within 48 hours"],
      offerSlug: null,
      category: "COMMUNITY",
      recurring: "monthly",
    }),
  },
  {
    slug: "community-ai-office-hours-2026-11",
    title: "AI Office Hours — Open Q&A with Studio Ordo Engineers",
    startAt: "2026-11-06T12:00:00-05:00",
    endAt: "2026-11-06T13:00:00-05:00",
    timezone: "America/New_York",
    capacity: 50,
    description:
      "Free drop-in office hours. Bring your AI questions, tool struggles, or project challenges. Studio Ordo engineers provide honest, no-jargon guidance. No registration required but RSVP helps us plan.",
    metadataJson: JSON.stringify({
      capability: null,
      spellBookTerms: [],
      artifacts: [],
      offerSlug: null,
      category: "COMMUNITY",
      recurring: "biweekly",
    }),
  },
];

const seedStudioOrdoFixture = (
  db: Database.Database,
  requestId: string,
): { offers: number; events: number; newsletterSeeded: number } => {
  const now = new Date().toISOString();
  let offersSeeded = 0;
  let eventsSeeded = 0;
  let newsletterSeeded = 0;

  const run = db.transaction(() => {
    /* ---------- Offers ---------- */
    const insertOffer = db.prepare(
      `INSERT OR IGNORE INTO offers
         (id, slug, title, summary, price_cents, currency, duration_label,
          refund_policy_key, audience, delivery_mode, status, booking_url,
          outcomes_json, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const offer of studioOrdoOffers) {
      const result = insertOffer.run(
        randomUUID(),
        offer.slug,
        offer.title,
        offer.summary,
        offer.priceCents,
        offer.currency,
        offer.durationLabel,
        offer.refundPolicyKey,
        offer.audience,
        offer.deliveryMode,
        "ACTIVE",
        offer.bookingUrl,
        JSON.stringify(offer.outcomes),
        null,
        now,
        now,
      );
      if (result.changes > 0) offersSeeded++;
    }

    /* ---------- Offer packages for corporate tiers ---------- */
    const insertPackage = db.prepare(
      `INSERT OR IGNORE INTO offer_packages
         (id, offer_id, name, scope, price_label, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const getOfferId = (slug: string): string | null => {
      const row = db
        .prepare("SELECT id FROM offers WHERE slug = ?")
        .get(slug) as { id: string } | undefined;
      return row?.id ?? null;
    };

    const starterOfferId = getOfferId("corporate-starter");
    if (starterOfferId) {
      insertPackage.run(
        randomUUID(), starterOfferId, "Standard",
        "Up to 15 participants", "$2,000", 1, now, now,
      );
      insertPackage.run(
        randomUUID(), starterOfferId, "Extended",
        "16-30 participants", "$2,000 + $125/person", 2, now, now,
      );
    }

    const proOfferId = getOfferId("corporate-professional");
    if (proOfferId) {
      insertPackage.run(
        randomUUID(), proOfferId, "Standard",
        "Up to 25 participants", "$5,000", 1, now, now,
      );
      insertPackage.run(
        randomUUID(), proOfferId, "Extended",
        "26-40 participants", "$5,000 + $200/person", 2, now, now,
      );
    }

    const entOfferId = getOfferId("corporate-enterprise");
    if (entOfferId) {
      insertPackage.run(
        randomUUID(), entOfferId, "Standard",
        "Up to 50 participants", "$10,000", 1, now, now,
      );
      insertPackage.run(
        randomUUID(), entOfferId, "With Quarterly Review",
        "Up to 50 + quarterly check-ins", "$10,000 + $2,500/quarter", 2, now, now,
      );
    }

    /* ---------- Events ---------- */
    const insertEvent = db.prepare(
      `INSERT OR IGNORE INTO events
         (id, slug, title, start_at, end_at, timezone, status, capacity,
          description, metadata_json, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const evt of studioOrdoEvents) {
      const result = insertEvent.run(
        randomUUID(),
        evt.slug,
        evt.title,
        evt.startAt,
        evt.endAt,
        evt.timezone,
        "PUBLISHED",
        evt.capacity,
        evt.description,
        evt.metadataJson,
        null,
        now,
        now,
      );
      if (result.changes > 0) eventsSeeded++;
    }

    /* ---------- Apprentice Levels ---------- */
    const insertLevel = db.prepare(
      `INSERT OR IGNORE INTO apprentice_levels
         (id, slug, name, ordinal, description, min_gate_projects, min_vocabulary,
          human_edge_focus, salary_range, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const levels = [
      {
        slug: "apprentice",
        name: "Apprentice",
        ordinal: 1,
        description: "Foundation level. Learn to write specs before code, build your first Context Pack, and establish the discipline of structured AI-assisted work.",
        minGates: 2,
        minVocab: 15,
        focus: "Disciplined Inquiry, Professional Judgment",
        salary: "$60,000–$80,000",
      },
      {
        slug: "journeyman",
        name: "Journeyman",
        ordinal: 2,
        description: "Intermediate level. Apply Problem Finding and Epistemic Humility to real projects. Lead AI audit processes and maintain production-quality work.",
        minGates: 2,
        minVocab: 30,
        focus: "Problem Finding, Epistemic Humility",
        salary: "$80,000–$110,000",
      },
      {
        slug: "senior-journeyman",
        name: "Senior Journeyman",
        ordinal: 3,
        description: "Advanced level. Design resilient systems, orchestrate agentic workflows, and mentor junior apprentices. Build for what breaks at 2 AM.",
        minGates: 2,
        minVocab: 45,
        focus: "Resilience Thinking, Systems Thinking",
        salary: "$110,000–$160,000",
      },
      {
        slug: "maestro-candidate",
        name: "Maestro Candidate",
        ordinal: 4,
        description: "Final level. Ship and present work publicly, translate complex AI concepts for any audience, and demonstrate accountable leadership across the full stack.",
        minGates: 2,
        minVocab: 60,
        focus: "Accountable Leadership, Translation",
        salary: "$140,000–$260,000+",
      },
    ];

    for (const level of levels) {
      insertLevel.run(
        randomUUID(), level.slug, level.name, level.ordinal, level.description,
        level.minGates, level.minVocab, level.focus, level.salary, now, now,
      );
    }

    /* ---------- Gate Projects ---------- */
    const insertGate = db.prepare(
      `INSERT INTO gate_projects
         (id, slug, title, level_slug, ordinal, summary,
          acceptance_criteria_json, rubric_json, estimated_hours,
          artifact_description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         title=excluded.title,
         level_slug=excluded.level_slug,
         ordinal=excluded.ordinal,
         summary=excluded.summary,
         acceptance_criteria_json=excluded.acceptance_criteria_json,
         rubric_json=excluded.rubric_json,
         estimated_hours=excluded.estimated_hours,
         artifact_description=excluded.artifact_description,
         updated_at=excluded.updated_at`,
    );

    const gateProjects = [
      {
        slug: "gate-01-context-pack",
        title: "Gate 1: Context Pack v1",
        levelSlug: "apprentice",
        ordinal: 1,
        summary: "Build your first Context Pack for a real project. Demonstrate that you can define what belongs to you before asking AI for help.",
        criteria: ["Context Pack includes project overview, constraints, domain terms", "At least 5 acceptance criteria defined", "AI Audit Log with 3+ entries documenting accept/reject/modify decisions", "Peer review completed"],
        rubric: { clarity: "Is the Context Pack clear enough for another developer?", completeness: "Does it cover constraints, domain, and acceptance criteria?", discipline: "Does the Audit Log show genuine evaluation of AI output?" },
        hours: 20,
        artifact: "Context Pack v1 document + AI Audit Log",
      },
      {
        slug: "gate-02-anatomy-physics",
        title: "Gate 2: Anatomy & Physics",
        levelSlug: "apprentice",
        ordinal: 2,
        summary: "Build a simulation or visualization that models a physical or biological system. Prove you can translate domain rules from outside software into working code.",
        criteria: ["System models a real-world physical or biological process", "Domain rules are explicitly documented before coding", "AI used to generate the simulation logic based on your rules", "Visual output accurately reflects the domain constraints"],
        rubric: { domain_accuracy: "Does the model respect the rules of the physical/biological system?", translation: "Are the domain rules clearly translated into software constraints?", orchestration: "Did you successfully direct the AI to build the simulation?" },
        hours: 25,
        artifact: "Working simulation + Domain Rules Document",
      },
      {
        slug: "gate-03-problem-decomposition",
        title: "Gate 3: Problem Decomposition",
        levelSlug: "journeyman",
        ordinal: 1,
        summary: "Take a complex, ambiguous problem and decompose it into a structured spec. Show that you can find the real problem beneath the stated one.",
        criteria: ["Problem statement distinguishes stated vs. actual problem", "Decomposition breaks problem into 5+ independently solvable sub-problems", "Context Pack v2 with domain model", "Evidence of at least 2 investigation techniques (interviews, data analysis, etc.)"],
        rubric: { depth: "Does the decomposition reach the real problem?", structure: "Are sub-problems well-defined and independent?", evidence: "Is the investigation grounded in data, not assumptions?" },
        hours: 30,
        artifact: "Problem Decomposition document + Context Pack v2",
      },
      {
        slug: "gate-04-humanities-computation",
        title: "Gate 4: Humanities & Computation",
        levelSlug: "journeyman",
        ordinal: 2,
        summary: "Apply computational methods to a problem in the humanities (history, literature, art). Demonstrate that you can operate across entirely different disciplines.",
        criteria: ["Project addresses a specific question in a humanities discipline", "Uses data analysis, NLP, or computer vision on a non-technical dataset", "Epistemic boundary clearly stated: what the computation cannot capture about the human element", "Findings presented in a format native to the chosen discipline"],
        rubric: { cross_disciplinary: "Does the project respect the methods of the humanities discipline?", technical_application: "Is the computational method appropriate for the question?", boundaries: "Are the limitations of the technical approach acknowledged?" },
        hours: 25,
        artifact: "Humanities Analysis Report + Code Repository",
      },
      {
        slug: "gate-05-failure-mode-analysis",
        title: "Gate 5: Failure Mode Analysis",
        levelSlug: "senior-journeyman",
        ordinal: 1,
        summary: "Design and document a Failure Mode Analysis for a production system. Run an incident drill and produce a blameless postmortem.",
        criteria: ["Failure Mode Analysis covering 5+ failure scenarios", "Each scenario includes probability, impact, detection method, and mitigation", "Incident drill conducted with documented outcomes", "Blameless postmortem with actionable follow-ups"],
        rubric: { coverage: "Are the failure modes realistic and comprehensive?", preparation: "Would this analysis actually help during an incident?", learning: "Does the postmortem identify systemic improvements?" },
        hours: 35,
        artifact: "Failure Mode Analysis + incident drill report + blameless postmortem",
      },
      {
        slug: "gate-06-agentic-workflow",
        title: "Gate 6: Agentic Workflow Design",
        levelSlug: "senior-journeyman",
        ordinal: 2,
        summary: "Design and implement an agentic workflow with proper orchestration, error handling, and human-in-the-loop checkpoints.",
        criteria: ["Agentic workflow with 3+ coordinated agents", "Orchestration pattern documented (routing, handoff, fallback)", "Human-in-the-loop checkpoint implemented", "Error handling covers agent failure, timeout, and hallucination", "Context Pack v3 with full system architecture"],
        rubric: { architecture: "Is the orchestration pattern well-suited to the problem?", safety: "Are human checkpoints placed at the right decision points?", robustness: "Does error handling cover realistic failure modes?" },
        hours: 40,
        artifact: "Agentic Workflow design + Context Pack v3 + working prototype",
      },
      {
        slug: "gate-07-demo-day",
        title: "Gate 7: Demo Day Presentation",
        levelSlug: "maestro-candidate",
        ordinal: 1,
        summary: "Ship a complete feature and present it publicly. Defend your technical decisions, show the audit trail, and demonstrate accountable leadership.",
        criteria: ["Feature shipped to production (or production-equivalent)", "15-minute presentation with live demo", "Q&A handled with evidence-based responses", "Audit trail presented showing decision-making process", "No bluffing — 'I don't know, here's how I'd find out' demonstrated at least once"],
        rubric: { delivery: "Is the presentation clear and professional?", accountability: "Does the presenter own their decisions, including mistakes?", honesty: "Is there evidence of the 'Do Not Bluff' principle?" },
        hours: 30,
        artifact: "Shipped feature + presentation recording + Q&A transcript",
      },
      {
        slug: "gate-08-translation-brief",
        title: "Gate 8: Translation Brief",
        levelSlug: "maestro-candidate",
        ordinal: 2,
        summary: "Take a complex AI concept and make it accessible to a non-technical audience. Demonstrate the Translation capability through teaching and mentoring.",
        criteria: ["Translation Brief for a non-technical audience", "Feynman technique applied and documented", "Audience analysis with cognitive load assessment", "Teaching session conducted (workshop, talk, or 1:1 mentoring)", "Community impact documented"],
        rubric: { clarity: "Would a non-technical person understand this?", technique: "Is the Feynman technique evidence visible?", impact: "Did the teaching session create measurable understanding?" },
        hours: 25,
        artifact: "Translation Brief + teaching session recording + audience feedback",
      },
    ];

    for (const gate of gateProjects) {
      insertGate.run(
        randomUUID(), gate.slug, gate.title, gate.levelSlug, gate.ordinal,
        gate.summary, JSON.stringify(gate.criteria), JSON.stringify(gate.rubric),
        gate.hours, gate.artifact, now, now,
      );
    }

    /* ── Pre-load first 4 newsletter issues as DRAFT ── */
    const newsletterIssues = [
      { title: "The Acceleration Is Real", issueDate: "2026-01-15" },
      { title: "The Salary Premium Is Now", issueDate: "2026-01-29" },
      { title: "What AI Strips Away", issueDate: "2026-02-12" },
      { title: "The CEO of Agents", issueDate: "2026-02-26" },
    ];

    const insertIssue = db.prepare(
      "INSERT OR IGNORE INTO newsletter_issues (id, title, issue_date, status, created_by, created_at, updated_at) VALUES (?, ?, ?, 'DRAFT', NULL, ?, ?)",
    );
    const insertBlock = db.prepare(
      "INSERT OR IGNORE INTO newsletter_blocks (id, issue_id, section, content_md, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    const sectionOrder: Record<string, number> = { MODELS: 10, MONEY: 20, PEOPLE: 30, FROM_FIELD: 40, NEXT_STEPS: 50 };

    for (const issue of newsletterIssues) {
      const existing = db.prepare("SELECT id FROM newsletter_issues WHERE title = ?").get(issue.title);
      if (!existing) {
        const issueId = randomUUID();
        insertIssue.run(issueId, issue.title, issue.issueDate, now, now);
        for (const [section, order] of Object.entries(sectionOrder)) {
          insertBlock.run(randomUUID(), issueId, section, "", order, now, now);
        }
        newsletterSeeded++;
      }
    }

    appendAudit(db, "db.seed.studio-ordo", requestId, {
      offersSeeded,
      eventsSeeded,
      newsletterSeeded,
    });
  });

  run();

  return { offers: offersSeeded, events: eventsSeeded, newsletterSeeded };
};

export interface SeedResult {
  seededRoles: number;
  seededOffers?: number;
  seededEvents?: number;
  seededNewsletter?: number;
}

export const dbSeed = (config: AppConfig, requestId: string, fixture?: string): SeedResult => {
  const status = dbStatus(config);
  if (status.pendingCount > 0) {
    throw preconditionError("Migrations are pending. Run `appctl db migrate` first.");
  }

  const db = openDb(config);
  try {
    const roleNames = ["USER", "ADMIN", "SUPER_ADMIN", "AFFILIATE", "APPRENTICE", "ASSOCIATE", "CERTIFIED_CONSULTANT", "STAFF"];

    const run = db.transaction(() => {
      for (const roleName of roleNames) {
        db.prepare("INSERT OR IGNORE INTO roles (id, name) VALUES (?, ?)").run(
          randomUUID(),
          roleName,
        );
      }

      appendAudit(db, "db.seed", requestId, {
        fixture: fixture ?? "default",
      });
    });

    run();

    const seededRoles = db.prepare("SELECT COUNT(*) AS count FROM roles").get() as { count: number };
    const result: SeedResult = { seededRoles: seededRoles.count };

    if (fixture === "studio-ordo") {
      const fixtureResult = seedStudioOrdoFixture(db, requestId);
      result.seededOffers = fixtureResult.offers;
      result.seededEvents = fixtureResult.events;
      result.seededNewsletter = fixtureResult.newsletterSeeded;
    }

    return result;
  } finally {
    db.close();
  }
};

export interface DoctorResult {
  dbReachable: boolean;
  schemaCurrent: boolean;
  walEnabled: boolean;
  foreignKeysEnabled: boolean;
  writable: boolean;
  dbPath: string;
}

export const doctor = (config: AppConfig): DoctorResult => {
  const dbPath = resolve(config.db.file);
  const db = openDb(config, false);

  try {
    const status = statusFromDb(db);
    const journal = db.pragma("journal_mode", { simple: true }) as string;
    const foreignKeys = db.pragma("foreign_keys", { simple: true }) as number;
    const busyTimeout = db.pragma("busy_timeout", { simple: true }) as number;

    const writeProbe = db.transaction(() => {
      db.exec("CREATE TABLE IF NOT EXISTS __appctl_write_probe (id INTEGER PRIMARY KEY)");
      db.exec("INSERT INTO __appctl_write_probe DEFAULT VALUES");
      db.exec("DELETE FROM __appctl_write_probe");
    });
    writeProbe();

    const result: DoctorResult = {
      dbReachable: true,
      schemaCurrent: status.pendingCount === 0,
      walEnabled: journal.toLowerCase() === "wal",
      foreignKeysEnabled: foreignKeys === 1,
      writable: true,
      dbPath,
    };

    if (!result.schemaCurrent) {
      throw preconditionError("Schema is not up to date. Run `appctl db migrate`.");
    }

    if (!result.walEnabled || !result.foreignKeysEnabled) {
      throw preconditionError("SQLite pragmas invalid. Require WAL mode and foreign_keys=ON.");
    }

    if (busyTimeout <= 0) {
      throw preconditionError("SQLite busy timeout invalid. Must be greater than 0.");
    }

    return result;
  } finally {
    db.close();
  }
};
