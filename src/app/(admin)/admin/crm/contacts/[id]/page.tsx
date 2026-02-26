"use client";

/**
 * /admin/crm/contacts/[id] — Contact detail page
 */

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntakeRecord {
  id: string;
  status: string;
  interest_area: string | null;
  created_at: string;
}

interface BookingRecord {
  id: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

interface ContactDetail {
  id: string;
  email: string;
  full_name: string | null;
  source: string;
  status: string;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  intakes: IntakeRecord[];
  bookings: BookingRecord[];
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  LEAD: ["QUALIFIED", "CHURNED"],
  QUALIFIED: ["ONBOARDING", "CHURNED"],
  ONBOARDING: ["ACTIVE", "CHURNED"],
  ACTIVE: ["CHURNED"],
  CHURNED: [],
};

const STATUS_LABELS: Record<string, string> = {
  LEAD: "Lead",
  QUALIFIED: "Qualified",
  ONBOARDING: "Onboarding",
  ACTIVE: "Active",
  CHURNED: "Churned",
};

const SOURCE_LABELS: Record<string, string> = {
  AGENT: "Chat agent",
  FORM: "Contact form",
  REFERRAL: "Referral",
  MANUAL: "Manual entry",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionMsg, setProvisionMsg] = useState<string | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Fetch contact
  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/crm/contacts/${id}`);
        if (!res.ok) {
          setError(`Failed to load contact (${res.status})`);
          return;
        }
        const data = (await res.json()) as ContactDetail;
        setContact(data);
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Update status
  async function handleStatusChange(newStatus: string) {
    if (!contact) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/v1/crm/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = (await res.json()) as ContactDetail;
        setContact(data);
      }
    } finally {
      setSavingStatus(false);
    }
  }

  // Provision account
  async function handleProvision() {
    if (!contact) return;
    setProvisioning(true);
    setProvisionMsg(null);
    try {
      const res = await fetch(`/api/v1/crm/contacts/${id}/provision`, {
        method: "POST",
      });
      if (res.status === 201) {
        const data = (await res.json()) as { user_id: string; email: string };
        setProvisionMsg(`Account created for ${data.email}`);
        // Reload contact to show updated status
        const reload = await fetch(`/api/v1/crm/contacts/${id}`);
        if (reload.ok) setContact((await reload.json()) as ContactDetail);
      } else if (res.status === 409) {
        setProvisionMsg("Account already exists for this contact.");
      } else {
        const body = (await res.json()) as { error?: string };
        setProvisionMsg(body.error ?? `Error (${res.status})`);
      }
    } catch {
      setProvisionMsg("Network error");
    } finally {
      setProvisioning(false);
    }
  }

  // Save notes on blur
  async function handleNotesSave() {
    if (!contact || !notesRef.current) return;
    const newNotes = notesRef.current.value;
    if (newNotes === (contact.notes ?? "")) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/v1/crm/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: newNotes }),
      });
      if (res.ok) {
        const data = (await res.json()) as ContactDetail;
        setContact(data);
      }
    } finally {
      setSavingNotes(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <main id="main-content" className="container-grid py-6">
        <p className="type-body-sm text-text-secondary">Loading…</p>
      </main>
    );
  }

  if (error || !contact) {
    return (
      <main id="main-content" className="container-grid py-6">
        <p className="type-body-sm text-text-error">{error ?? "Contact not found"}</p>
        <Link href="/admin/crm" className="type-label text-brand hover:underline mt-2 block">
          ← Back to pipeline
        </Link>
      </main>
    );
  }

  const allowedTransitions = VALID_TRANSITIONS[contact.status] ?? [];

  return (
    <main id="main-content" className="container-grid py-6 max-w-2xl">
      {/* Breadcrumb */}
      <Link href="/admin/crm" className="type-meta text-text-secondary hover:text-text-primary mb-4 block">
        ← CRM Pipeline
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="type-title text-text-primary">
            {contact.full_name ?? contact.email}
          </h1>
          {contact.full_name && (
            <p className="type-body-sm text-text-secondary">{contact.email}</p>
          )}
          <p className="type-meta text-text-muted mt-1">
            {SOURCE_LABELS[contact.source] ?? contact.source} · joined{" "}
            {new Date(contact.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Provision button */}
        {contact.status === "QUALIFIED" && (
          <div className="flex flex-col items-end gap-1">
            <button
              disabled={provisioning}
              onClick={() => void handleProvision()}
              className="type-label bg-brand text-text-inverse px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50"
            >
              {provisioning ? "Provisioning…" : "Approve & Create Account"}
            </button>
            {provisionMsg && (
              <p className="type-meta text-text-secondary">{provisionMsg}</p>
            )}
          </div>
        )}

        {/* Status badge + transition dropdown */}
        <div className="flex flex-col items-end gap-2">
          <span className="type-label text-text-primary border border-border bg-bg-subtle rounded px-2 py-1">
            {STATUS_LABELS[contact.status] ?? contact.status}
          </span>
          {allowedTransitions.length > 0 && (
            <select
              disabled={savingStatus}
              onChange={(e) => {
                if (e.target.value) void handleStatusChange(e.target.value);
              }}
              value=""
              className="type-meta border border-border rounded px-2 py-1 bg-bg-surface text-text-secondary"
            >
              <option value="">Move to…</option>
              {allowedTransitions.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Notes */}
      <section className="mb-6">
        <h2 className="type-label text-text-primary mb-2">Notes</h2>
        <textarea
          ref={notesRef}
          defaultValue={contact.notes ?? ""}
          onBlur={() => void handleNotesSave()}
          rows={4}
          placeholder="Add notes about this contact…"
          className="w-full border border-border rounded p-2 type-body-sm text-text-primary bg-bg-surface resize-y focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {savingNotes && (
          <p className="type-meta text-text-muted mt-1">Saving…</p>
        )}
      </section>

      {/* Intake records */}
      <section className="mb-6">
        <h2 className="type-label text-text-primary mb-2">
          Intake records ({contact.intakes.length})
        </h2>
        {contact.intakes.length === 0 ? (
          <p className="type-body-sm text-text-muted">No intake records.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {contact.intakes.map((intake) => (
              <div
                key={intake.id}
                className="border border-border rounded p-3 bg-bg-surface flex items-center justify-between"
              >
                <div>
                  <p className="type-label text-text-primary">
                    {intake.interest_area ?? "General inquiry"}
                  </p>
                  <p className="type-meta text-text-muted">
                    {intake.status} · {new Date(intake.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/admin/intake?id=${intake.id}`}
                  className="type-meta text-brand hover:underline"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bookings */}
      <section>
        <h2 className="type-label text-text-primary mb-2">
          Bookings ({contact.bookings.length})
        </h2>
        {contact.bookings.length === 0 ? (
          <p className="type-body-sm text-text-muted">No bookings.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {contact.bookings.map((booking) => (
              <div
                key={booking.id}
                className="border border-border rounded p-3 bg-bg-surface"
              >
                <p className="type-label text-text-primary">
                  {booking.scheduled_at
                    ? new Date(booking.scheduled_at).toLocaleString()
                    : "Time TBD"}
                </p>
                <p className="type-meta text-text-muted">{booking.status}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
