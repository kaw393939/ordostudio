import { randomUUID } from "node:crypto";

import { resolveConfig } from "@/platform/config";
import { appendAuditLog, openCliDb } from "@/platform/runtime";

/* ── Types ─────────────────────────────────────────── */

export type ApprenticeLevelRecord = {
  id: string;
  slug: string;
  name: string;
  ordinal: number;
  description: string | null;
  min_gate_projects: number;
  min_vocabulary: number;
  human_edge_focus: string | null;
  salary_range: string | null;
  created_at: string;
  updated_at: string;
};

export type GateProjectRecord = {
  id: string;
  slug: string;
  title: string;
  level_slug: string;
  ordinal: number;
  summary: string | null;
  acceptance_criteria_json: string | null;
  rubric_json: string | null;
  estimated_hours: number | null;
  artifact_description: string | null;
  created_at: string;
  updated_at: string;
};

export type GateSubmissionStatus = "SUBMITTED" | "IN_REVIEW" | "PASSED" | "REVISION_NEEDED";

export type GateSubmissionRecord = {
  id: string;
  user_id: string;
  gate_project_id: string;
  status: GateSubmissionStatus;
  submission_url: string | null;
  submission_notes: string | null;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VocabularyRecord = {
  id: string;
  user_id: string;
  term_slug: string;
  term_name: string;
  demonstrated_at: string;
  context: string | null;
  created_at: string;
};

export type ApprenticeProgress = {
  currentLevel: ApprenticeLevelRecord | null;
  levels: ApprenticeLevelRecord[];
  gateProjects: GateProjectRecord[];
  submissions: GateSubmissionRecord[];
  vocabularyCount: number;
  nextGate: GateProjectRecord | null;
};

/* ── Errors ────────────────────────────────────────── */

export class GateProjectNotFoundError extends Error {
  constructor(slug: string) {
    super(`gate_project_not_found:${slug}`);
    this.name = "GateProjectNotFoundError";
  }
}

export class GateSubmissionNotFoundError extends Error {
  constructor(id: string) {
    super(`gate_submission_not_found:${id}`);
    this.name = "GateSubmissionNotFoundError";
  }
}

export class VocabularyTermAlreadyExistsError extends Error {
  constructor(termSlug: string) {
    super(`vocabulary_term_exists:${termSlug}`);
    this.name = "VocabularyTermAlreadyExistsError";
  }
}

/* ── Levels (public) ───────────────────────────────── */

export const listLevels = (): ApprenticeLevelRecord[] => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    return db
      .prepare("SELECT * FROM apprentice_levels ORDER BY ordinal ASC")
      .all() as ApprenticeLevelRecord[];
  } finally {
    db.close();
  }
};

/* ── Gate Projects (public) ────────────────────────── */

export const listGateProjects = (): GateProjectRecord[] => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    return db
      .prepare("SELECT * FROM gate_projects ORDER BY level_slug, ordinal ASC")
      .all() as GateProjectRecord[];
  } finally {
    db.close();
  }
};

export const getGateProjectBySlug = (slug: string): GateProjectRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const row = db
      .prepare("SELECT * FROM gate_projects WHERE slug = ?")
      .get(slug) as GateProjectRecord | undefined;
    if (!row) throw new GateProjectNotFoundError(slug);
    return row;
  } finally {
    db.close();
  }
};

/* ── Progress (auth'd) ─────────────────────────────── */

export const getApprenticeProgress = (userId: string): ApprenticeProgress => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const profile = db
      .prepare("SELECT current_level FROM apprentice_profiles WHERE user_id = ?")
      .get(userId) as { current_level: string | null } | undefined;

    const levels = db
      .prepare("SELECT * FROM apprentice_levels ORDER BY ordinal ASC")
      .all() as ApprenticeLevelRecord[];

    const currentLevel =
      levels.find((l) => l.slug === (profile?.current_level ?? "apprentice")) ?? null;

    const gateProjects = db
      .prepare("SELECT * FROM gate_projects ORDER BY level_slug, ordinal ASC")
      .all() as GateProjectRecord[];

    const submissions = db
      .prepare("SELECT * FROM apprentice_gate_submissions WHERE user_id = ? ORDER BY created_at ASC")
      .all(userId) as GateSubmissionRecord[];

    const vocabCount = db
      .prepare("SELECT COUNT(*) AS count FROM apprentice_vocabulary WHERE user_id = ?")
      .get(userId) as { count: number };

    // Find next gate: first gate project in current level that has no PASSED submission
    const passedProjectIds = new Set(
      submissions.filter((s) => s.status === "PASSED").map((s) => s.gate_project_id),
    );
    const currentLevelGates = gateProjects.filter(
      (g) => g.level_slug === (currentLevel?.slug ?? "apprentice"),
    );
    const nextGate = currentLevelGates.find((g) => !passedProjectIds.has(g.id)) ?? null;

    return {
      currentLevel,
      levels,
      gateProjects,
      submissions,
      vocabularyCount: vocabCount.count,
      nextGate,
    };
  } finally {
    db.close();
  }
};

/* ── Gate Submissions ──────────────────────────────── */

export const createGateSubmission = (input: {
  userId: string;
  gateProjectSlug: string;
  submissionUrl?: string;
  submissionNotes?: string;
  requestId: string;
}): GateSubmissionRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const project = db
      .prepare("SELECT id FROM gate_projects WHERE slug = ?")
      .get(input.gateProjectSlug) as { id: string } | undefined;
    if (!project) throw new GateProjectNotFoundError(input.gateProjectSlug);

    const now = new Date().toISOString();
    const id = randomUUID();

    db.prepare(
      `INSERT INTO apprentice_gate_submissions
         (id, user_id, gate_project_id, status, submission_url, submission_notes, created_at, updated_at)
       VALUES (?, ?, ?, 'SUBMITTED', ?, ?, ?, ?)`,
    ).run(
      id,
      input.userId,
      project.id,
      input.submissionUrl ?? null,
      input.submissionNotes ?? null,
      now,
      now,
    );

    appendAuditLog(db, {
      action: "apprentice.gate.submit",
      actorType: "USER",
      actorId: input.userId,
      targetType: "gate_submission",
      requestId: input.requestId,
      metadata: { gateProjectSlug: input.gateProjectSlug },
    });

    return db
      .prepare("SELECT * FROM apprentice_gate_submissions WHERE id = ?")
      .get(id) as GateSubmissionRecord;
  } finally {
    db.close();
  }
};

export const reviewGateSubmission = (input: {
  submissionId: string;
  reviewerId: string;
  status: "PASSED" | "REVISION_NEEDED";
  reviewerNotes?: string;
  requestId: string;
}): GateSubmissionRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const existing = db
      .prepare("SELECT * FROM apprentice_gate_submissions WHERE id = ?")
      .get(input.submissionId) as GateSubmissionRecord | undefined;
    if (!existing) throw new GateSubmissionNotFoundError(input.submissionId);

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE apprentice_gate_submissions
       SET status = ?, reviewer_id = ?, reviewer_notes = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`,
    ).run(input.status, input.reviewerId, input.reviewerNotes ?? null, now, now, input.submissionId);

    // If passed, check if level advancement is warranted
    if (input.status === "PASSED") {
      advanceLevelIfReady(db, existing.user_id);
    }

    appendAuditLog(db, {
      action: `apprentice.gate.${input.status === "PASSED" ? "pass" : "revise"}`,
      actorType: "USER",
      actorId: input.reviewerId,
      targetType: "gate_submission",
      requestId: input.requestId,
      metadata: {
        apprenticeUserId: existing.user_id,
        status: input.status,
      },
    });

    return db
      .prepare("SELECT * FROM apprentice_gate_submissions WHERE id = ?")
      .get(input.submissionId) as GateSubmissionRecord;
  } finally {
    db.close();
  }
};

/* ── Level Advancement Logic ───────────────────────── */

const advanceLevelIfReady = (db: ReturnType<typeof openCliDb>, userId: string): void => {
  const profile = db
    .prepare("SELECT current_level FROM apprentice_profiles WHERE user_id = ?")
    .get(userId) as { current_level: string | null } | undefined;
  if (!profile) return;

  const currentSlug = profile.current_level ?? "apprentice";

  const levels = db
    .prepare("SELECT * FROM apprentice_levels ORDER BY ordinal ASC")
    .all() as ApprenticeLevelRecord[];

  const currentLevel = levels.find((l) => l.slug === currentSlug);
  if (!currentLevel) return;

  const nextLevel = levels.find((l) => l.ordinal === currentLevel.ordinal + 1);
  if (!nextLevel) return; // Already at max level

  // Count passed gates at current level
  const passedGates = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM apprentice_gate_submissions ags
       JOIN gate_projects gp ON gp.id = ags.gate_project_id
       WHERE ags.user_id = ? AND ags.status = 'PASSED' AND gp.level_slug = ?`,
    )
    .get(userId, currentSlug) as { count: number };

  // Count vocabulary
  const vocabCount = db
    .prepare("SELECT COUNT(*) AS count FROM apprentice_vocabulary WHERE user_id = ?")
    .get(userId) as { count: number };

  if (
    passedGates.count >= currentLevel.min_gate_projects &&
    vocabCount.count >= currentLevel.min_vocabulary
  ) {
    db.prepare("UPDATE apprentice_profiles SET current_level = ?, updated_at = ? WHERE user_id = ?").run(
      nextLevel.slug,
      new Date().toISOString(),
      userId,
    );
  }
};

/* ── Vocabulary ────────────────────────────────────── */

export const listVocabulary = (userId: string): VocabularyRecord[] => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    return db
      .prepare("SELECT * FROM apprentice_vocabulary WHERE user_id = ? ORDER BY demonstrated_at ASC")
      .all(userId) as VocabularyRecord[];
  } finally {
    db.close();
  }
};

export const addVocabularyTerm = (input: {
  userId: string;
  termSlug: string;
  termName: string;
  context?: string;
  requestId: string;
}): VocabularyRecord => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    const now = new Date().toISOString();
    const id = randomUUID();

    try {
      db.prepare(
        `INSERT INTO apprentice_vocabulary (id, user_id, term_slug, term_name, demonstrated_at, context, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, input.userId, input.termSlug, input.termName, now, input.context ?? null, now);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.includes("UNIQUE constraint failed") &&
        err.message.includes("apprentice_vocabulary")
      ) {
        throw new VocabularyTermAlreadyExistsError(input.termSlug);
      }
      throw err;
    }

    appendAuditLog(db, {
      action: "apprentice.vocabulary.add",
      actorType: "USER",
      actorId: input.userId,
      targetType: "vocabulary",
      requestId: input.requestId,
      metadata: { termSlug: input.termSlug, termName: input.termName },
    });

    return db
      .prepare("SELECT * FROM apprentice_vocabulary WHERE id = ?")
      .get(id) as VocabularyRecord;
  } finally {
    db.close();
  }
};
