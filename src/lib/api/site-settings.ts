import Database from "better-sqlite3";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";

export const ALLOWED_SITE_SETTING_KEYS: string[] = [
  "contact.phone",
  "contact.email",
  "contact.booking_url",
  "brand.name",
  "brand.tagline",
  "commission.rate_pct",
  "guild.affiliate_min_payout_usd",
];

export function getSiteSettings(db: Database.Database): Record<string, string> {
  const rows = db
    .prepare("SELECT key, value FROM site_settings ORDER BY key ASC")
    .all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function getSiteSetting(
  db: Database.Database,
  key: string
): string | null {
  const row = db
    .prepare("SELECT value FROM site_settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setSiteSetting(
  db: Database.Database,
  key: string,
  value: string
): void {
  db.prepare(
    `UPDATE site_settings SET value = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE key = ?`
  ).run(value, key);
}

/** Opens its own DB connection — for use outside of request handlers */
export function getSiteSettingStandalone(key: string): string | null {
  const db = openCliDb(resolveConfig({ envVars: process.env }));
  try {
    return getSiteSetting(db, key);
  } finally {
    db.close();
  }
}
