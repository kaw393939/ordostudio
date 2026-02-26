import { randomBytes, randomUUID } from "node:crypto";

import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";
import { writeFeedEvent } from "@/lib/api/feed-events";
import { AFFILIATE_COMMISSION_RATE } from "@/lib/constants/commissions";
import { Money } from "@/core/domain/money";

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

export class SelfReferralError extends Error {
  constructor() {
    super("Self-referral is not permitted.");
    this.name = "SelfReferralError";
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
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("UNIQUE constraint failed: referral_codes.user_id")) {
          // Row was just created by a concurrent request — return it
          const created = db
            .prepare("SELECT id, user_id, code, created_at, updated_at FROM referral_codes WHERE user_id = ?")
            .get(input.userId) as ReferralCodeRecord | undefined;
          if (created) return created;
        }
        if (msg.toLowerCase().includes("unique")) {
          continue; // code collision — retry with a new code
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
  ownerUserId?: string | null;
  requestId: string;
}): void => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const referral = lookupReferralCode(input.referralCode);

    // Policy rule 3: self-referral must be blocked.
    if (input.ownerUserId && referral.user_id === input.ownerUserId) {
      throw new SelfReferralError();
    }

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

    writeFeedEvent(db, {
      userId: referral.user_id,
      type: "ReferralActivity",
      title: "Referral converted.",
      description: `Code ${referral.code} — a new lead came through your referral link. Commission pending engagement completion.`,
    });
  } finally {
    db.close();
  }
};

export const recordReferralConversionForDeal = (input: {
  dealId: string;
  requestId: string;
}): void => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    // Find the referral code attributed to this deal's originating intake.
    const referralRow = db
      .prepare(
        `SELECT rc.id as referral_code_id, rc.user_id, rc.code
         FROM referral_conversions conv
         JOIN referral_codes rc ON rc.id = conv.referral_code_id
         WHERE conv.intake_request_id = (SELECT intake_id FROM deals WHERE id = ?)
           AND conv.conversion_type = 'INTAKE_REQUEST'
         LIMIT 1`,
      )
      .get(input.dealId) as { referral_code_id: string; user_id: string; code: string } | undefined;

    if (!referralRow) {
      return; // No referral attributed to this deal — nothing to record.
    }

    // Idempotency guard: skip if already recorded.
    const already = db
      .prepare(
        "SELECT id FROM referral_conversions WHERE referral_code_id = ? AND conversion_type = 'DEAL_PAID' AND deal_id = ?",
      )
      .get(referralRow.referral_code_id, input.dealId);

    if (already) return;

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      "INSERT INTO referral_conversions (id, referral_code_id, conversion_type, deal_id, created_at) VALUES (?, ?, 'DEAL_PAID', ?, ?)",
    ).run(id, referralRow.referral_code_id, input.dealId, now);

    appendAuditLog(db, {
      actorType: "SERVICE",
      actorId: null,
      action: "api.referral.conversion",
      targetType: "referral_code",
      requestId: input.requestId,
      metadata: {
        referralCodeId: referralRow.referral_code_id,
        code: referralRow.code,
        conversionType: "DEAL_PAID",
        dealId: input.dealId,
      },
    });

    writeFeedEvent(db, {
      userId: referralRow.user_id,
      type: "ReferralActivity",
      title: "Referral deal confirmed.",
      description: `Code ${referralRow.code} — your referred lead's deal has been paid. Commission earned.`,
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
    SUM(CASE WHEN p.status = 'ACCEPTED' THEN p.amount_cents ELSE 0 END) as gross_accepted_cents,
    MAX(p.currency) as currency
  FROM referral_conversions conv
  LEFT JOIN proposals p ON p.intake_request_id = conv.intake_request_id
  GROUP BY conv.referral_code_id
) gross ON gross.referral_code_id = rc.id
ORDER BY conversions DESC, clicks DESC, u.email ASC
`,
      )
      .all() as Array<{ user_id: string; user_email: string; code: string; clicks: number; conversions: number; gross_accepted_cents: number; currency: string | null }>;

    const items: ReferralAdminRow[] = rows.map((row) => {
      const clicks = Number(row.clicks ?? 0);
      const conversions = Number(row.conversions ?? 0);
      const conversionRate = clicks === 0 ? 0 : conversions / clicks;
      const grossAccepted = Number(row.gross_accepted_cents ?? 0);
      // Use Money.multiplyRate so rounding logic is identical to the ledger path.
      // Falls back to USD when no accepted proposal exists (grossAccepted is 0).
      const commission = Money.cents(grossAccepted, row.currency ?? "USD")
        .multiplyRate(AFFILIATE_COMMISSION_RATE).amountCents;

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
