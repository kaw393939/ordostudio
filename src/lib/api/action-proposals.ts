import { resolveConfig } from "../../cli/config";
import { openCliDb } from "@/platform/runtime";
import { randomUUID } from "crypto";

export type ActionProposal = {
  id: string;
  action_type: string;
  payload: string;
  preconditions: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "APPROVED" | "DENIED" | "EXPIRED";
  proposed_by: string | null;
  proposed_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rationale: string | null;
};

export const createActionProposal = (args: {
  action_type: string;
  payload: unknown;
  preconditions: unknown;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  proposed_by?: string;
}): ActionProposal => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO action_proposals (
      id, action_type, payload, preconditions, risk_level, status, proposed_by, proposed_at
    ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(
    id,
    args.action_type,
    JSON.stringify(args.payload),
    JSON.stringify(args.preconditions),
    args.risk_level,
    args.proposed_by || null,
    now
  );

  return getActionProposal(id)!;
};

export const getActionProposal = (id: string): ActionProposal | null => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  const row = db.prepare("SELECT * FROM action_proposals WHERE id = ?").get(id) as ActionProposal | undefined;
  return row || null;
};

export const listActionProposals = (args: {
  status?: "PENDING" | "APPROVED" | "DENIED" | "EXPIRED";
  limit: number;
  offset: number;
}): { items: ActionProposal[]; count: number } => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  let query = "SELECT * FROM action_proposals";
  let countQuery = "SELECT COUNT(*) as c FROM action_proposals";
  const params: unknown[] = [];

  if (args.status) {
    query += " WHERE status = ?";
    countQuery += " WHERE status = ?";
    params.push(args.status);
  }

  query += " ORDER BY proposed_at DESC LIMIT ? OFFSET ?";
  
  const items = db.prepare(query).all(...params, args.limit, args.offset) as ActionProposal[];
  const countRow = db.prepare(countQuery).get(...params) as { c: number };

  return { items, count: countRow.c };
};

export const reviewActionProposal = (args: {
  id: string;
  status: "APPROVED" | "DENIED";
  reviewed_by: string;
  rationale: string;
}): ActionProposal => {
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  const now = new Date().toISOString();

  db.transaction(() => {
    const proposal = getActionProposal(args.id);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "PENDING") throw new Error("Proposal is not pending");

    db.prepare(`
      UPDATE action_proposals
      SET status = ?, reviewed_by = ?, reviewed_at = ?, rationale = ?
      WHERE id = ?
    `).run(args.status, args.reviewed_by, now, args.rationale, args.id);

    db.prepare(`
      INSERT INTO audit_log (id, action, actor_id, target_id, target_type, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      `api.action_proposals.${args.status.toLowerCase()}`,
      args.reviewed_by,
      args.id,
      "action_proposal",
      JSON.stringify({ rationale: args.rationale, action_type: proposal.action_type }),
      now
    );
  })();

  return getActionProposal(args.id)!;
};
