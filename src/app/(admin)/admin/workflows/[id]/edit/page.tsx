"use client";

/**
 * /admin/workflows/[id]/edit — Edit an existing workflow rule
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const TRIGGER_EVENTS = [
  "AccountRegistration",
  "EngagementTimelineItem",
  "FollowUpAction",
  "OnboardingProgress",
  "SubscriptionEvent",
  "TriageTicket",
  "RoleRequestUpdate",
  "ReferralActivity",
  "PayoutStatus",
];

const ACTION_TYPES = [
  { value: "UPDATE_CONTACT_STATUS", label: "Update contact status" },
  { value: "ASSIGN_TO_STAFF", label: "Assign to staff member" },
  { value: "SEND_EMAIL", label: "Send email" },
  { value: "CREATE_FEED_EVENT", label: "Create feed event" },
];

interface WorkflowRule {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  condition_json: string | null;
  action_type: string;
  action_config: string;
  enabled: number;
  position: number;
}

export default function EditWorkflowRulePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerEvent, setTriggerEvent] = useState(TRIGGER_EVENTS[0]);
  const [conditionJson, setConditionJson] = useState("");
  const [actionType, setActionType] = useState(ACTION_TYPES[0].value);
  const [actionConfig, setActionConfig] = useState("{}");
  const [enabled, setEnabled] = useState(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const res = await fetch(`/api/v1/admin/workflows/${id}`);
        if (res.ok) {
          const rule = (await res.json()) as WorkflowRule;
          setName(rule.name);
          setDescription(rule.description ?? "");
          setTriggerEvent(rule.trigger_event);
          setConditionJson(rule.condition_json ?? "");
          setActionType(rule.action_type);
          setActionConfig(rule.action_config);
          setEnabled(rule.enabled === 1);
          setPosition(rule.position);
        } else {
          setError(`Rule not found (${res.status})`);
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/admin/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          trigger_event: triggerEvent,
          condition_json: conditionJson || null,
          action_type: actionType,
          action_config: actionConfig,
          enabled: enabled ? 1 : 0,
          position,
        }),
      });

      if (res.ok) {
        router.push("/admin/workflows");
      } else {
        const body = (await res.json()) as { detail?: string };
        setError(body.detail ?? `Error (${res.status})`);
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main id="main-content" className="container-grid py-6">
        <p className="type-body-sm text-text-secondary">Loading…</p>
      </main>
    );
  }

  return (
    <main id="main-content" className="container-grid py-6 max-w-xl">
      <Link
        href="/admin/workflows"
        className="type-meta text-text-secondary hover:text-text-primary mb-4 block"
      >
        ← Workflow Rules
      </Link>
      <h1 className="type-title text-text-primary mb-6">Edit Workflow Rule</h1>

      {error && <p className="type-body-sm text-text-error mb-4">{error}</p>}

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div>
          <label className="type-label text-text-primary block mb-1">Name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 type-body-sm bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div>
          <label className="type-label text-text-primary block mb-1">Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 type-body-sm bg-bg-surface text-text-primary resize-y focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div>
          <label className="type-label text-text-primary block mb-1">Trigger Event *</label>
          <select
            value={triggerEvent}
            onChange={(e) => setTriggerEvent(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 type-body-sm bg-bg-surface text-text-primary"
          >
            {TRIGGER_EVENTS.map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="type-label text-text-primary block mb-1">Condition JSON (optional)</label>
          <input
            placeholder='{"field":"payload.title","operator":"eq","value":"..."}'
            value={conditionJson}
            onChange={(e) => setConditionJson(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 type-body-sm font-mono bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div>
          <label className="type-label text-text-primary block mb-1">Action Type *</label>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 type-body-sm bg-bg-surface text-text-primary"
          >
            {ACTION_TYPES.map((at) => (
              <option key={at.value} value={at.value}>{at.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="type-label text-text-primary block mb-1">Action Config (JSON) *</label>
          <textarea
            required
            rows={3}
            value={actionConfig}
            onChange={(e) => setActionConfig(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 type-body-sm font-mono bg-bg-surface text-text-primary resize-y focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            id="position"
            value={position}
            onChange={(e) => setPosition(parseInt(e.target.value, 10) || 0)}
            className="w-20 border border-border rounded px-2 py-1 type-body-sm bg-bg-surface text-text-primary"
          />
          <label htmlFor="position" className="type-body-sm text-text-secondary">
            Position (evaluation order)
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 accent-brand"
          />
          <label htmlFor="enabled" className="type-body-sm text-text-primary">
            Rule enabled
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="type-label bg-brand text-text-inverse px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <Link
            href="/admin/workflows"
            className="type-label text-text-secondary hover:text-text-primary px-4 py-2 rounded border border-border"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
