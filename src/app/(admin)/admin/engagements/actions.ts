"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { resolveConfig } from "@/platform/config";
import { openCliDb } from "@/platform/runtime";

import { AFFILIATE_COMMISSION_RATE } from "@/lib/constants/commissions";
const COMMISSION_RATE = AFFILIATE_COMMISSION_RATE;

// ---- Create engagement -------------------------------------------------------

export async function createEngagement(formData: FormData): Promise<void> {
  const type = formData.get("type") as string;
  const clientName = (formData.get("client_name") as string | null) || null;
  const studentId = (formData.get("student_id") as string | null) || null;
  const projectType = (formData.get("project_type") as string | null) || null;
  const totalValueRaw = formData.get("total_value") as string | null;
  const track = (formData.get("track") as string | null) || null;
  const cohortStart = (formData.get("cohort_start") as string | null) || null;
  const referralCode =
    ((formData.get("referral_code") as string | null) || "").trim().toUpperCase() || null;
  const notes = (formData.get("notes") as string | null) || null;

  const totalValue = totalValueRaw ? Math.round(parseFloat(totalValueRaw) * 100) : null;
  const commission = totalValue != null ? Math.round(totalValue * COMMISSION_RATE) : null;

  const now = new Date().toISOString();
  const id = randomUUID();

  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);
  try {
    db.prepare(
      `INSERT INTO engagements
         (id, type, client_name, student_id, project_type, total_value, commission,
          referral_code, track, cohort_start, payment_status, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'ACTIVE', ?, ?, ?)`,
    ).run(
      id,
      type,
      clientName,
      studentId,
      projectType,
      totalValue,
      commission,
      referralCode,
      track,
      cohortStart,
      notes,
      now,
      now,
    );
  } finally {
    db.close();
  }

  redirect(`/admin/engagements/${id}`);
}

// ---- Complete engagement (mark completed + write ledger entries) ---------------

export async function completeEngagement(engagementId: string): Promise<void> {
  const now = new Date().toISOString();
  const config = resolveConfig({ envVars: process.env });
  const db = openCliDb(config);

  type EngRow = {
    id: string;
    type: string;
    total_value: number | null;
    commission: number | null;
    referral_code: string | null;
    status: string;
  };

  try {
    const eng = db
      .prepare("SELECT id, type, total_value, commission, referral_code, status FROM engagements WHERE id = ?")
      .get(engagementId) as EngRow | undefined;

    if (!eng) throw new Error(`Engagement ${engagementId} not found`);
    if (eng.status === "COMPLETED") throw new Error("Already completed");

    const insertLedger = db.prepare(
      `INSERT INTO ledger_entries
         (id, engagement_id, entry_type, amount_cents, currency, status, earned_at, metadata_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'USD', 'EARNED', ?, ?, ?, ?)`,
    );

    db.transaction(() => {
      // Mark engagement completed
      db.prepare(
        "UPDATE engagements SET status = 'COMPLETED', updated_at = ? WHERE id = ?",
      ).run(now, engagementId);

      // PLATFORM_REVENUE entry for commission amount
      if (eng.commission != null && eng.commission > 0) {
        insertLedger.run(
          randomUUID(),
          engagementId,
          "PLATFORM_REVENUE",
          eng.commission,
          now,
          JSON.stringify({ source: `engagement:${eng.type}`, engagement_id: engagementId }),
          now,
          now,
        );
      }

      // REFERRER_COMMISSION entry if referral_code present
      if (eng.referral_code && eng.commission != null && eng.commission > 0) {
        // Referrer earns COMMISSION_RATE of Studio Ordo's commission
        const referrerAmount = Math.round(eng.commission * COMMISSION_RATE);
        insertLedger.run(
          randomUUID(),
          engagementId,
          "REFERRER_COMMISSION",
          referrerAmount,
          now,
          JSON.stringify({
            source: `engagement:${eng.type}`,
            engagement_id: engagementId,
            referral_code: eng.referral_code,
          }),
          now,
          now,
        );
      }
    })();
  } finally {
    db.close();
  }

  redirect(`/admin/engagements/${engagementId}`);
}
