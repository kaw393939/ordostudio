"use client";

/**
 * /admin/crm — CRM Pipeline Board
 *
 * Kanban-style view: LEAD | QUALIFIED | ONBOARDING | ACTIVE | CHURNED
 */

import { useEffect, useState } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Contact {
  id: string;
  email: string;
  full_name: string | null;
  source: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  intake_count: number;
}

interface PipelineBuckets {
  LEAD: number;
  QUALIFIED: number;
  ONBOARDING: number;
  ACTIVE: number;
  CHURNED: number;
}

const STATUS_COLUMNS: (keyof PipelineBuckets)[] = [
  "LEAD",
  "QUALIFIED",
  "ONBOARDING",
  "ACTIVE",
  "CHURNED",
];

const STATUS_LABELS: Record<string, string> = {
  LEAD: "Lead",
  QUALIFIED: "Qualified",
  ONBOARDING: "Onboarding",
  ACTIVE: "Active",
  CHURNED: "Churned",
};

const SOURCE_LABELS: Record<string, string> = {
  AGENT: "Chat",
  FORM: "Form",
  REFERRAL: "Referral",
  MANUAL: "Manual",
};

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CrmPipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [buckets, setBuckets] = useState<PipelineBuckets>({
    LEAD: 0,
    QUALIFIED: 0,
    ONBOARDING: 0,
    ACTIVE: 0,
    CHURNED: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>("LEAD");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [pipelineRes, contactsRes] = await Promise.all([
          fetch("/api/v1/crm/pipeline"),
          fetch(`/api/v1/crm/contacts?status=${activeStatus}&limit=50`),
        ]);

        if (pipelineRes.ok) {
          const data = (await pipelineRes.json()) as { buckets: PipelineBuckets };
          setBuckets(data.buckets);
        }
        if (contactsRes.ok) {
          const data = (await contactsRes.json()) as { items: Contact[] };
          setContacts(data.items);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [activeStatus]);

  return (
    <main id="main-content" className="container-grid py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="type-title text-text-primary">CRM Pipeline</h1>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {STATUS_COLUMNS.map((status) => (
          <button
            key={status}
            onClick={() => setActiveStatus(status)}
            className={`px-4 py-2 type-label whitespace-nowrap border-b-2 transition-colors ${
              activeStatus === status
                ? "border-brand text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {STATUS_LABELS[status]}
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                activeStatus === status
                  ? "bg-brand text-text-inverse"
                  : "bg-bg-subtle text-text-secondary"
              }`}
            >
              {buckets[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Contact cards */}
      {loading ? (
        <div className="text-text-secondary type-body-sm py-8 text-center">Loading…</div>
      ) : contacts.length === 0 ? (
        <div className="text-text-secondary type-body-sm py-8 text-center">
          No {STATUS_LABELS[activeStatus].toLowerCase()} contacts.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="border border-border rounded p-4 bg-bg-surface flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="type-label text-text-primary">
                    {contact.full_name ?? contact.email}
                  </span>
                  {contact.full_name && (
                    <span className="type-meta text-text-secondary">{contact.email}</span>
                  )}
                  <span className="text-xs bg-bg-subtle border border-border rounded px-1.5 py-0.5 text-text-secondary">
                    {SOURCE_LABELS[contact.source] ?? contact.source}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="type-meta text-text-muted">
                    {daysSince(contact.created_at)}d ago
                  </span>
                  {contact.intake_count > 0 && (
                    <span className="type-meta text-text-muted">
                      {contact.intake_count} intake{contact.intake_count > 1 ? "s" : ""}
                    </span>
                  )}
                  {contact.assigned_to && (
                    <span className="type-meta text-text-muted">Assigned</span>
                  )}
                </div>
              </div>
              <Link
                href={`/admin/crm/contacts/${contact.id}`}
                className="shrink-0 type-label text-brand hover:underline"
              >
                View →
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
