import { randomUUID } from "node:crypto";
import { openCliDb, appendAuditLog } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";

export type OfferAudience = "INDIVIDUAL" | "GROUP" | "BOTH";
export type OfferDeliveryMode = "ONLINE" | "IN_PERSON" | "HYBRID";
export type OfferStatus = "ACTIVE" | "INACTIVE";

export interface OfferPackageRecord {
  id: string;
  offer_id: string;
  name: string;
  scope: string;
  price_label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OfferRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  price_cents: number | null;
  currency: string;
  duration_label: string;
  refund_policy_key: string;
  audience: OfferAudience;
  delivery_mode: OfferDeliveryMode;
  status: OfferStatus;
  booking_url: string;
  outcomes: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfferWithPackages extends OfferRecord {
  packages: OfferPackageRecord[];
}

export class OfferNotFoundError extends Error {
  constructor(public readonly slug: string) {
    super(`Offer not found: ${slug}`);
    this.name = "OfferNotFoundError";
  }
}

export class OfferConflictError extends Error {
  constructor(public readonly slug: string) {
    super(`Offer already exists: ${slug}`);
    this.name = "OfferConflictError";
  }
}

export class InvalidOfferInputError extends Error {
  constructor(public readonly reason: string) {
    super(`Invalid offer input: ${reason}`);
    this.name = "InvalidOfferInputError";
  }
}

export class OfferPackageNotFoundError extends Error {
  constructor(public readonly packageId: string) {
    super(`Offer package not found: ${packageId}`);
    this.name = "OfferPackageNotFoundError";
  }
}

const ALLOWED_AUDIENCE: OfferAudience[] = ["INDIVIDUAL", "GROUP", "BOTH"];
const ALLOWED_DELIVERY_MODE: OfferDeliveryMode[] = ["ONLINE", "IN_PERSON", "HYBRID"];
const ALLOWED_STATUS: OfferStatus[] = ["ACTIVE", "INACTIVE"];

const parseOutcomes = (raw: string | null): string[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
};

const rowToOffer = (row: {
  id: string;
  slug: string;
  title: string;
  summary: string;
  price_cents: number | null;
  currency: string;
  duration_label: string;
  refund_policy_key: string;
  audience: OfferAudience;
  delivery_mode: OfferDeliveryMode;
  status: OfferStatus;
  booking_url: string;
  outcomes_json: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}): OfferRecord => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  price_cents: row.price_cents ?? null,
  currency: row.currency,
  duration_label: row.duration_label,
  refund_policy_key: row.refund_policy_key,
  audience: row.audience,
  delivery_mode: row.delivery_mode,
  status: row.status,
  booking_url: row.booking_url,
  outcomes: parseOutcomes(row.outcomes_json),
  created_by: row.created_by,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const normalizeSlug = (input: string): string => input.trim().toLowerCase();

const assertOfferInputs = (input: {
  slug?: string;
  title?: string;
  summary?: string;
  priceCents?: number | null;
  currency?: string;
  durationLabel?: string;
  refundPolicyKey?: string;
  audience?: string;
  deliveryMode?: string;
  status?: string;
  bookingUrl?: string;
}): void => {
  if (input.slug !== undefined && normalizeSlug(input.slug).length === 0) {
    throw new InvalidOfferInputError("slug_required");
  }

  if (input.title !== undefined && input.title.trim().length === 0) {
    throw new InvalidOfferInputError("title_required");
  }

  if (input.summary !== undefined && input.summary.trim().length === 0) {
    throw new InvalidOfferInputError("summary_required");
  }

  if (input.priceCents !== undefined && input.priceCents !== null) {
    if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) {
      throw new InvalidOfferInputError("price_cents_invalid");
    }
  }

  if (input.currency !== undefined) {
    const normalized = input.currency.trim().toUpperCase();
    if (normalized.length !== 3) {
      throw new InvalidOfferInputError("currency_invalid");
    }
  }

  if (input.durationLabel !== undefined && input.durationLabel.trim().length === 0) {
    throw new InvalidOfferInputError("duration_label_required");
  }

  if (input.refundPolicyKey !== undefined && input.refundPolicyKey.trim().length === 0) {
    throw new InvalidOfferInputError("refund_policy_key_required");
  }

  if (input.bookingUrl !== undefined) {
    try {
      const url = new URL(input.bookingUrl);
      if (!url.protocol.startsWith("http")) {
        throw new Error("invalid");
      }
    } catch {
      throw new InvalidOfferInputError("booking_url_invalid");
    }
  }

  if (input.audience !== undefined && !ALLOWED_AUDIENCE.includes(input.audience as OfferAudience)) {
    throw new InvalidOfferInputError("audience_invalid");
  }

  if (input.deliveryMode !== undefined && !ALLOWED_DELIVERY_MODE.includes(input.deliveryMode as OfferDeliveryMode)) {
    throw new InvalidOfferInputError("delivery_mode_invalid");
  }

  if (input.status !== undefined && !ALLOWED_STATUS.includes(input.status as OfferStatus)) {
    throw new InvalidOfferInputError("status_invalid");
  }
};

const assertPackageInputs = (input: {
  name?: string;
  scope?: string;
  priceLabel?: string;
  sortOrder?: number;
}): void => {
  if (input.name !== undefined && input.name.trim().length === 0) {
    throw new InvalidOfferInputError("package_name_required");
  }

  if (input.scope !== undefined && input.scope.trim().length === 0) {
    throw new InvalidOfferInputError("package_scope_required");
  }

  if (input.priceLabel !== undefined && input.priceLabel.trim().length === 0) {
    throw new InvalidOfferInputError("package_price_required");
  }

  if (input.sortOrder !== undefined && !Number.isInteger(input.sortOrder)) {
    throw new InvalidOfferInputError("package_sort_order_invalid");
  }
};

export const listOffers = (filters: {
  q?: string;
  audience?: string;
  deliveryMode?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.q && filters.q.trim().length > 0) {
      where.push("(LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(slug) LIKE ?)");
      const needle = `%${filters.q.trim().toLowerCase()}%`;
      params.push(needle, needle, needle);
    }

    if (filters.audience && ALLOWED_AUDIENCE.includes(filters.audience as OfferAudience)) {
      where.push("(audience = ? OR audience = 'BOTH')");
      params.push(filters.audience);
    }

    if (filters.deliveryMode && ALLOWED_DELIVERY_MODE.includes(filters.deliveryMode as OfferDeliveryMode)) {
      where.push("(delivery_mode = ? OR delivery_mode = 'HYBRID')");
      params.push(filters.deliveryMode);
    }

    if (filters.status && filters.status !== "all") {
      if (!ALLOWED_STATUS.includes(filters.status as OfferStatus)) {
        throw new InvalidOfferInputError("status_invalid");
      }
      where.push("status = ?");
      params.push(filters.status);
    } else {
      where.push("status = 'ACTIVE'");
    }

    const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
    const offset = Math.max(filters.offset ?? 0, 0);
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const rows = db
      .prepare(
        `
SELECT id, slug, title, summary, price_cents, currency, duration_label, refund_policy_key, audience, delivery_mode, status, booking_url, outcomes_json, created_by, created_at, updated_at
FROM offers
${whereSql}
ORDER BY updated_at DESC, title ASC
LIMIT ? OFFSET ?
`,
      )
      .all(...params, limit, offset) as {
      id: string;
      slug: string;
      title: string;
      summary: string;
      price_cents: number | null;
      currency: string;
      duration_label: string;
      refund_policy_key: string;
      audience: OfferAudience;
      delivery_mode: OfferDeliveryMode;
      status: OfferStatus;
      booking_url: string;
      outcomes_json: string | null;
      created_by: string | null;
      created_at: string;
      updated_at: string;
    }[];

    return {
      count: rows.length,
      limit,
      offset,
      items: rows.map(rowToOffer),
    };
  } finally {
    db.close();
  }
};

export const getOfferBySlug = (slug: string): OfferWithPackages => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const found = db
      .prepare(
        "SELECT id, slug, title, summary, price_cents, currency, duration_label, refund_policy_key, audience, delivery_mode, status, booking_url, outcomes_json, created_by, created_at, updated_at FROM offers WHERE slug = ?",
      )
      .get(normalizeSlug(slug)) as
      | {
          id: string;
          slug: string;
          title: string;
          summary: string;
          price_cents: number | null;
          currency: string;
          duration_label: string;
          refund_policy_key: string;
          audience: OfferAudience;
          delivery_mode: OfferDeliveryMode;
          status: OfferStatus;
          booking_url: string;
          outcomes_json: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!found) {
      throw new OfferNotFoundError(slug);
    }

    const packages = db
      .prepare(
        "SELECT id, offer_id, name, scope, price_label, sort_order, created_at, updated_at FROM offer_packages WHERE offer_id = ? ORDER BY sort_order ASC, created_at ASC",
      )
      .all(found.id) as OfferPackageRecord[];

    return {
      ...rowToOffer(found),
      packages,
    };
  } finally {
    db.close();
  }
};

export const createOffer = (input: {
  slug: string;
  title: string;
  summary: string;
  priceCents: number;
  currency: string;
  durationLabel: string;
  refundPolicyKey: string;
  audience: OfferAudience;
  deliveryMode: OfferDeliveryMode;
  bookingUrl: string;
  outcomes?: string[];
  status?: OfferStatus;
  actorId: string;
  requestId: string;
}): OfferRecord => {
  assertOfferInputs({
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    priceCents: input.priceCents,
    currency: input.currency,
    durationLabel: input.durationLabel,
    refundPolicyKey: input.refundPolicyKey,
    audience: input.audience,
    deliveryMode: input.deliveryMode,
    status: input.status,
    bookingUrl: input.bookingUrl,
  });

  if ((input.status ?? "ACTIVE") === "ACTIVE") {
    if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) {
      throw new InvalidOfferInputError("price_cents_required");
    }
    if (input.durationLabel.trim().length === 0) {
      throw new InvalidOfferInputError("duration_label_required");
    }
    if (input.refundPolicyKey.trim().length === 0) {
      throw new InvalidOfferInputError("refund_policy_key_required");
    }
  }

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  try {
    const now = new Date().toISOString();
    const id = randomUUID();
    const slug = normalizeSlug(input.slug);
    const outcomes = (input.outcomes ?? []).map((item) => item.trim()).filter((item) => item.length > 0);

    try {
      db.prepare(
        `
INSERT INTO offers (
  id, slug, title, summary, price_cents, currency, duration_label, refund_policy_key, audience, delivery_mode, status, booking_url, outcomes_json, created_by, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
      ).run(
        id,
        slug,
        input.title.trim(),
        input.summary.trim(),
        input.priceCents,
        input.currency.trim().toUpperCase(),
        input.durationLabel.trim(),
        input.refundPolicyKey.trim(),
        input.audience,
        input.deliveryMode,
        input.status ?? "ACTIVE",
        input.bookingUrl,
        outcomes.length > 0 ? JSON.stringify(outcomes) : null,
        input.actorId,
        now,
        now,
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed: offers.slug")) {
        throw new OfferConflictError(slug);
      }
      throw error;
    }

    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.actorId,
      action: "api.offer.create",
      targetType: "offer",
      requestId: input.requestId,
      metadata: {
        offerId: id,
        slug,
      },
    });

    return {
      id,
      slug,
      title: input.title.trim(),
      summary: input.summary.trim(),
      price_cents: input.priceCents,
      currency: input.currency.trim().toUpperCase(),
      duration_label: input.durationLabel.trim(),
      refund_policy_key: input.refundPolicyKey.trim(),
      audience: input.audience,
      delivery_mode: input.deliveryMode,
      status: input.status ?? "ACTIVE",
      booking_url: input.bookingUrl,
      outcomes,
      created_by: input.actorId,
      created_at: now,
      updated_at: now,
    };
  } finally {
    db.close();
  }
};

export const updateOffer = (
  slug: string,
  input: {
    title?: string;
    summary?: string;
    priceCents?: number | null;
    currency?: string;
    durationLabel?: string;
    refundPolicyKey?: string;
    audience?: OfferAudience;
    deliveryMode?: OfferDeliveryMode;
    bookingUrl?: string;
    outcomes?: string[];
    status?: OfferStatus;
    confirmPriceChange?: boolean;
    actorId: string;
    requestId: string;
  },
): OfferRecord => {
  assertOfferInputs({
    title: input.title,
    summary: input.summary,
    priceCents: input.priceCents,
    currency: input.currency,
    durationLabel: input.durationLabel,
    refundPolicyKey: input.refundPolicyKey,
    audience: input.audience,
    deliveryMode: input.deliveryMode,
    status: input.status,
    bookingUrl: input.bookingUrl,
  });

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const found = db
      .prepare(
        "SELECT id, slug, title, summary, price_cents, currency, duration_label, refund_policy_key, audience, delivery_mode, status, booking_url, outcomes_json, created_by, created_at, updated_at FROM offers WHERE slug = ?",
      )
      .get(normalizeSlug(slug)) as
      | {
          id: string;
          slug: string;
          title: string;
          summary: string;
          price_cents: number | null;
          currency: string;
          duration_label: string;
          refund_policy_key: string;
          audience: OfferAudience;
          delivery_mode: OfferDeliveryMode;
          status: OfferStatus;
          booking_url: string;
          outcomes_json: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!found) {
      throw new OfferNotFoundError(slug);
    }

    const now = new Date().toISOString();

    const nextPriceCents = input.priceCents !== undefined ? input.priceCents : found.price_cents;
    const hasPriceChange = input.priceCents !== undefined && input.priceCents !== found.price_cents;
    if (hasPriceChange && !input.confirmPriceChange) {
      throw new InvalidOfferInputError("price_change_requires_confirm");
    }
    const nextOutcomes = input.outcomes
      ? input.outcomes.map((item) => item.trim()).filter((item) => item.length > 0)
      : parseOutcomes(found.outcomes_json);

    const next: OfferRecord = {
      ...rowToOffer(found),
      title: input.title?.trim() ?? found.title,
      summary: input.summary?.trim() ?? found.summary,
      price_cents: nextPriceCents ?? null,
      currency: input.currency?.trim().toUpperCase() ?? found.currency,
      duration_label: input.durationLabel?.trim() ?? found.duration_label,
      refund_policy_key: input.refundPolicyKey?.trim() ?? found.refund_policy_key,
      audience: input.audience ?? found.audience,
      delivery_mode: input.deliveryMode ?? found.delivery_mode,
      booking_url: input.bookingUrl ?? found.booking_url,
      outcomes: nextOutcomes,
      status: input.status ?? found.status,
      updated_at: now,
    };

    if (next.status === "ACTIVE") {
      if (next.price_cents === null || !Number.isInteger(next.price_cents) || next.price_cents <= 0) {
        throw new InvalidOfferInputError("price_cents_required");
      }
      if (next.duration_label.trim().length === 0) {
        throw new InvalidOfferInputError("duration_label_required");
      }
      if (next.refund_policy_key.trim().length === 0) {
        throw new InvalidOfferInputError("refund_policy_key_required");
      }
    }

    db.prepare(
      `
UPDATE offers
SET title = ?, summary = ?, price_cents = ?, currency = ?, duration_label = ?, refund_policy_key = ?, audience = ?, delivery_mode = ?, status = ?, booking_url = ?, outcomes_json = ?, updated_at = ?
WHERE id = ?
`,
    ).run(
      next.title,
      next.summary,
      next.price_cents,
      next.currency,
      next.duration_label,
      next.refund_policy_key,
      next.audience,
      next.delivery_mode,
      next.status,
      next.booking_url,
      next.outcomes.length > 0 ? JSON.stringify(next.outcomes) : null,
      next.updated_at,
      next.id,
    );

    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.actorId,
      action: "api.offer.update",
      targetType: "offer",
      requestId: input.requestId,
      metadata: {
        offerId: next.id,
        slug: next.slug,
      },
    });

    return next;
  } finally {
    db.close();
  }
};

export const deleteOffer = (slug: string, actorId: string, requestId: string): void => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const found = db.prepare("SELECT id, slug FROM offers WHERE slug = ?").get(normalizeSlug(slug)) as
      | { id: string; slug: string }
      | undefined;

    if (!found) {
      throw new OfferNotFoundError(slug);
    }

    db.prepare("DELETE FROM offers WHERE id = ?").run(found.id);

    appendAuditLog(db, {
      actorType: "USER",
      actorId,
      action: "api.offer.delete",
      targetType: "offer",
      requestId,
      metadata: {
        offerId: found.id,
        slug: found.slug,
      },
    });
  } finally {
    db.close();
  }
};

export const createOfferPackage = (
  offerSlug: string,
  input: {
    name: string;
    scope: string;
    priceLabel: string;
    sortOrder?: number;
    actorId: string;
    requestId: string;
  },
): OfferPackageRecord => {
  assertPackageInputs(input);

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const offer = db.prepare("SELECT id FROM offers WHERE slug = ?").get(normalizeSlug(offerSlug)) as { id: string } | undefined;
    if (!offer) {
      throw new OfferNotFoundError(offerSlug);
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    const sortOrder = input.sortOrder ?? 100;

    db.prepare(
      `
INSERT INTO offer_packages (id, offer_id, name, scope, price_label, sort_order, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`,
    ).run(id, offer.id, input.name.trim(), input.scope.trim(), input.priceLabel.trim(), sortOrder, now, now);

    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.actorId,
      action: "api.offer.package.create",
      targetType: "offer_package",
      requestId: input.requestId,
      metadata: {
        offerId: offer.id,
        packageId: id,
      },
    });

    return {
      id,
      offer_id: offer.id,
      name: input.name.trim(),
      scope: input.scope.trim(),
      price_label: input.priceLabel.trim(),
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
    };
  } finally {
    db.close();
  }
};

export const updateOfferPackage = (
  offerSlug: string,
  packageId: string,
  input: {
    name?: string;
    scope?: string;
    priceLabel?: string;
    sortOrder?: number;
    actorId: string;
    requestId: string;
  },
): OfferPackageRecord => {
  assertPackageInputs(input);

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const offer = db.prepare("SELECT id FROM offers WHERE slug = ?").get(normalizeSlug(offerSlug)) as { id: string } | undefined;
    if (!offer) {
      throw new OfferNotFoundError(offerSlug);
    }

    const found = db
      .prepare(
        "SELECT id, offer_id, name, scope, price_label, sort_order, created_at, updated_at FROM offer_packages WHERE id = ? AND offer_id = ?",
      )
      .get(packageId, offer.id) as OfferPackageRecord | undefined;

    if (!found) {
      throw new OfferPackageNotFoundError(packageId);
    }

    const next: OfferPackageRecord = {
      ...found,
      name: input.name?.trim() ?? found.name,
      scope: input.scope?.trim() ?? found.scope,
      price_label: input.priceLabel?.trim() ?? found.price_label,
      sort_order: input.sortOrder ?? found.sort_order,
      updated_at: new Date().toISOString(),
    };

    db.prepare(
      `
UPDATE offer_packages
SET name = ?, scope = ?, price_label = ?, sort_order = ?, updated_at = ?
WHERE id = ?
`,
    ).run(next.name, next.scope, next.price_label, next.sort_order, next.updated_at, next.id);

    appendAuditLog(db, {
      actorType: "USER",
      actorId: input.actorId,
      action: "api.offer.package.update",
      targetType: "offer_package",
      requestId: input.requestId,
      metadata: {
        offerId: offer.id,
        packageId,
      },
    });

    return next;
  } finally {
    db.close();
  }
};

export const deleteOfferPackage = (
  offerSlug: string,
  packageId: string,
  actorId: string,
  requestId: string,
): void => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const offer = db.prepare("SELECT id FROM offers WHERE slug = ?").get(normalizeSlug(offerSlug)) as { id: string } | undefined;
    if (!offer) {
      throw new OfferNotFoundError(offerSlug);
    }

    const removed = db.prepare("DELETE FROM offer_packages WHERE id = ? AND offer_id = ?").run(packageId, offer.id);
    if (removed.changes === 0) {
      throw new OfferPackageNotFoundError(packageId);
    }

    appendAuditLog(db, {
      actorType: "USER",
      actorId,
      action: "api.offer.package.delete",
      targetType: "offer_package",
      requestId,
      metadata: {
        offerId: offer.id,
        packageId,
      },
    });
  } finally {
    db.close();
  }
};
