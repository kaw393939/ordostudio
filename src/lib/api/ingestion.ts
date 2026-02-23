import { randomUUID, createHash } from "node:crypto";
import { openCliDb } from "@/platform/runtime";
import { resolveConfig } from "@/platform/config";
import { ApiActor } from "./actor";

export interface IngestedItemInput {
  sourceType: string;
  externalId: string;
  canonicalUrl: string;
  title: string;
  summary?: string;
  rawPayload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown>;
}

export interface IngestedItem {
  id: string;
  sourceType: string;
  externalId: string;
  contentHash: string;
  canonicalUrl: string;
  title: string;
  summary: string | null;
  rawPayload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const computeHash = (payload: Record<string, unknown>): string => {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

export const ingestItem = (actor: ApiActor, input: IngestedItemInput): IngestedItem => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  const now = new Date().toISOString();
  const contentHash = computeHash(input.rawPayload);

  try {
    const existing = db
      .prepare("SELECT * FROM ingested_items WHERE source_type = ? AND external_id = ?")
      .get(input.sourceType, input.externalId) as any;

    if (existing) {
      if (existing.content_hash === contentHash) {
        return {
          id: existing.id,
          sourceType: existing.source_type,
          externalId: existing.external_id,
          contentHash: existing.content_hash,
          canonicalUrl: existing.canonical_url,
          title: existing.title,
          summary: existing.summary,
          rawPayload: JSON.parse(existing.raw_payload),
          normalizedPayload: JSON.parse(existing.normalized_payload),
          createdAt: existing.created_at,
          updatedAt: existing.updated_at,
        };
      }

      db.prepare(
        `UPDATE ingested_items 
         SET content_hash = ?, canonical_url = ?, title = ?, summary = ?, raw_payload = ?, normalized_payload = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        contentHash,
        input.canonicalUrl,
        input.title,
        input.summary || null,
        JSON.stringify(input.rawPayload),
        JSON.stringify(input.normalizedPayload),
        now,
        existing.id
      );

      return {
        id: existing.id,
        sourceType: input.sourceType,
        externalId: input.externalId,
        contentHash,
        canonicalUrl: input.canonicalUrl,
        title: input.title,
        summary: input.summary || null,
        rawPayload: input.rawPayload,
        normalizedPayload: input.normalizedPayload,
        createdAt: existing.created_at,
        updatedAt: now,
      };
    }

    const id = randomUUID();
    db.prepare(
      `INSERT INTO ingested_items (id, source_type, external_id, content_hash, canonical_url, title, summary, raw_payload, normalized_payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.sourceType,
      input.externalId,
      contentHash,
      input.canonicalUrl,
      input.title,
      input.summary || null,
      JSON.stringify(input.rawPayload),
      JSON.stringify(input.normalizedPayload),
      now,
      now
    );

    return {
      id,
      sourceType: input.sourceType,
      externalId: input.externalId,
      contentHash,
      canonicalUrl: input.canonicalUrl,
      title: input.title,
      summary: input.summary || null,
      rawPayload: input.rawPayload,
      normalizedPayload: input.normalizedPayload,
      createdAt: now,
      updatedAt: now,
    };
  } finally {
    db.close();
  }
};

export const listIngestedItems = (actor: ApiActor, sourceType?: string): IngestedItem[] => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    let query = "SELECT * FROM ingested_items";
    const params: any[] = [];

    if (sourceType) {
      query += " WHERE source_type = ?";
      params.push(sourceType);
    }

    query += " ORDER BY created_at DESC";

    const rows = db.prepare(query).all(...params) as any[];

    return rows.map((row) => ({
      id: row.id,
      sourceType: row.source_type,
      externalId: row.external_id,
      contentHash: row.content_hash,
      canonicalUrl: row.canonical_url,
      title: row.title,
      summary: row.summary,
      rawPayload: JSON.parse(row.raw_payload),
      normalizedPayload: JSON.parse(row.normalized_payload),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } finally {
    db.close();
  }
};
