import { randomBytes, randomUUID } from "node:crypto";

import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";

export type ReferralCodeRecord = {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
  updated_at: string;
};

export type ReferralAdminRow = {
  user_id: string;
  user_email: string;
  code: string;
  clicks: number;
  conversions: number;
  conversion_rate: number;
  gross_accepted_cents: number;
  commission_owed_cents: number;
};

export type ReferralAdminReport = {
  totals: {
    members: number;
    clicks: number;
    conversions: number;
    gross_accepted_cents: number;
    commission_owed_cents: number;
  };
  items: ReferralAdminRow[];
};

export class ReferralCodeNotFoundError extends Error {
  constructor(public readonly code: string) {
    super(`Referral code not found: ${code}`);
    this.name = "ReferralCodeNotFoundError";
  }
}

const normalizeCode = (value: string): string => value.trim().toUpperCase();

const generateCode = (): string => {
  // Readable, URL-safe, case-insensitive.
  const raw = randomBytes(6).toString("base64url");
  return raw.replaceAll("-", "").replaceAll("_", "").slice(0, 10).toUpperCase();
};

export const getOrCreateReferralCode = (input: { userId: string; requestId: string }): ReferralCodeRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const existing = db
      .prepare("SELECT id, user_id, code, created_at, updated_at FROM referral_codes WHERE user_id = ?")
      .get(input.userId) as ReferralCodeRecord | undefined;

    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const id = randomUUID();
      const code = normalizeCode(generateCode());

      try {
        db.prepare(
          "INSERT INTO referral_codes (id, user_id, code, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        ).run(id, input.userId, code, now, now);

        appendAuditLog(db, {
          actorType: "USER",
          actorId: input.userId,
          action: "api.referral.code.create",
          targetType: "referral_code",
          requestId: input.requestId,
          metadata: {
            referralCodeId: id,
            code,
          },
        });

        return { id, user_id: input.userId, code, created_at: now, updated_at: now };
      } catch (error) {
        if (String(error).toLowerCase().includes("unique")) {
          continue;
        }
        throw error;
      }
    }

    throw new Error("Unable to generate unique referral code.");
  } finally {
    db.close();
  }
};

export const lookupReferralCode = (code: string): ReferralCodeRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const row = db
      .prepare("SELECT id, user_id, code, created_at, updated_at FROM referral_codes WHERE code = ?")
      .get(normalizeCode(code)) as ReferralCodeRecord | undefined;

    if (!row) {
      throw new ReferralCodeNotFoundError(code);
    }

    return row;
  } finally {
    db.close();
  }
};

export const recordReferralClick = (input: {
  code: string;
  path: string;
  referer: string | null;
  userAgent: string | null;
  requestId: string;
}): void => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const referral = lookupReferralCode(input.code);

    const now = new Date().toISOString();
    const id = randomUUID();

    db.prepare(
      "INSERT INTO referral_clicks (id, referral_code_id, path, referer, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(id, referral.id, input.path, input.referer, input.userAgent, now);

    appendAuditLog(db, {
      actorType: "SERVICE",
      actorId: null,
      action: "api.referral.click",
      targetType: "referral_code",
      requestId: input.requestId,
      metadata: {
        referralCodeId: referral.id,
        code: referral.code,
        path: input.path,
      },
    });
  } finally {
    db.close();
  }
};

export const recordReferralConversionForIntake = (input: {
  referralCode: string;
  intakeRequestId: string;
  requestId: string;
}): void => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const referral = lookupReferralCode(input.referralCode);

    const now = new Date().toISOString();
    const id = randomUUID();

    db.prepare(
      "INSERT INTO referral_conversions (id, referral_code_id, conversion_type, intake_request_id, created_at) VALUES (?, ?, 'INTAKE_REQUEST', ?, ?)",
    ).run(id, referral.id, input.intakeRequestId, now);

    appendAuditLog(db, {
      actorType: "SERVICE",
      actorId: null,
      action: "api.referral.conversion",
      targetType: "referral_code",
      requestId: input.requestId,
      metadata: {
        referralCodeId: referral.id,
        code: referral.code,
        conversionType: "INTAKE_REQUEST",
        intakeRequestId: input.intakeRequestId,
      },
    });
  } finally {
    db.close();
  }
};

export const getReferralAdminReport = (): ReferralAdminReport => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const rows = db
      .prepare(
        `
SELECT
  rc.user_id as user_id,
  u.email as user_email,
  rc.code as code,
  COALESCE(clicks.clicks, 0) as clicks,
  COALESCE(conversions.conversions, 0) as conversions,
  COALESCE(gross.gross_accepted_cents, 0) as gross_accepted_cents
FROM referral_codes rc
JOIN users u ON u.id = rc.user_id
LEFT JOIN (
  SELECT referral_code_id, COUNT(*) as clicks
  FROM referral_clicks
  GROUP BY referral_code_id
) clicks ON clicks.referral_code_id = rc.id
LEFT JOIN (
  SELECT referral_code_id, COUNT(*) as conversions
  FROM referral_conversions
  GROUP BY referral_code_id
) conversions ON conversions.referral_code_id = rc.id
LEFT JOIN (
  SELECT
    conv.referral_code_id as referral_code_id,
    SUM(CASE WHEN p.status = 'ACCEPTED' THEN p.amount_cents ELSE 0 END) as gross_accepted_cents
  FROM referral_conversions conv
  LEFT JOIN proposals p ON p.intake_request_id = conv.intake_request_id
  GROUP BY conv.referral_code_id
) gross ON gross.referral_code_id = rc.id
ORDER BY conversions DESC, clicks DESC, u.email ASC
`,
      )
      .all() as Array<{ user_id: string; user_email: string; code: string; clicks: number; conversions: number; gross_accepted_cents: number }>;

    const items: ReferralAdminRow[] = rows.map((row) => {
      const clicks = Number(row.clicks ?? 0);
      const conversions = Number(row.conversions ?? 0);
      const conversionRate = clicks === 0 ? 0 : conversions / clicks;
      const grossAccepted = Number(row.gross_accepted_cents ?? 0);
      const commission = Math.floor(grossAccepted * 0.25);

      return {
        user_id: row.user_id,
        user_email: row.user_email,
        code: row.code,
        clicks,
        conversions,
        conversion_rate: conversionRate,
        gross_accepted_cents: grossAccepted,
        commission_owed_cents: commission,
      };
    });

    const totals = items.reduce(
      (acc, row) => {
        acc.members += 1;
        acc.clicks += row.clicks;
        acc.conversions += row.conversions;
        acc.gross_accepted_cents += row.gross_accepted_cents;
        acc.commission_owed_cents += row.commission_owed_cents;
        return acc;
      },
      { members: 0, clicks: 0, conversions: 0, gross_accepted_cents: 0, commission_owed_cents: 0 },
    );

    return { totals, items };
  } finally {
    db.close();
  }
};

const escapeCsv = (value: string): string => {
  const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  return `"${normalized.replaceAll('"', '""')}"`;
};

export const exportReferralAdminReportCsv = (): string => {
  const report = getReferralAdminReport();

  const header = [
    "member_email",
    "referral_code",
    "clicks",
    "conversions",
    "conversion_rate",
    "gross_accepted_cents",
    "commission_owed_cents",
  ].join(",");

  const lines = report.items.map((row) => {
    return [
      escapeCsv(row.user_email),
      escapeCsv(row.code),
      escapeCsv(String(row.clicks)),
      escapeCsv(String(row.conversions)),
      escapeCsv(String(row.conversion_rate)),
      escapeCsv(String(row.gross_accepted_cents)),
      escapeCsv(String(row.commission_owed_cents)),
    ].join(",");
  });

  return [header, ...lines].join("\n");
};

export const parseCookieHeader = (cookieHeader: string | null): Record<string, string> => {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) continue;
    cookies[rawKey] = decodeURIComponent(rest.join("=") ?? "");
  }
  return cookies;
};
