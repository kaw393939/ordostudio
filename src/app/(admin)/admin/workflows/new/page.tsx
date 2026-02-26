"use client";

/**
 * /admin/workflows/new — Create a new workflow rule
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const DEFAULT_ACTION_CONFIG: Record<string, string> = {
  UPDATE_CONTACT_STATUS: '{"to_status":"QUALIFIED"}',
  ASSIGN_TO_STAFF: '{"staff_user_id":""}',
  SEND_EMAIL: '{"template":"","to":"contact"}',
  CREATE_FEED_EVENT: '{"type":"FollowUpAction","title":"","description":""}',
};

export default function NewWorkflowRulePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerEvent, setTriggerEvent] = useState(TRIGGER_EVENTS[0]);
  const [conditionField, setConditionField] = useState("");
  const [conditionOperator, setConditionOperator] = useState("eq");
  const [conditionValue, setConditionValue] = useState("");
  const [actionType, setActionType] = useState(ACTION_TYPES[0].value);
  const [actionConfig, setActionConfig] = useState(DEFAULT_ACTION_CONFIG[ACTION_TYPES[0].value]);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleActionTypeChange(newType: string) {
    setActionType(newType);
    setActionConfig(DEFAULT_ACTION_CONFIG[newType] ?? "{}");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const conditionJson =
      conditionField && conditionValue
        ? JSON.stringify({ field: conditionField, operator: conditionOperator, value: conditionValue })
        : null;

    try {
      const res = await fetch("/api/v1/admin/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          trigger_event: triggerEvent,
          condition_json: conditionJson,
          action_type: actionType,
          action_config: actionConfig,
          enabled: enabled ? 1 : 0,
        }),
      });

      if (res.status === 201) {
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

  return (
    <main id="main-content" className="container-grid py-6 max-w-xl">
      <Link
        href="/admin/workflows"
        className="type-meta text-text-secondary hover:text-text-primary mb-4 block"
      >
        ← Workflow Rules
      </Link>
      <h1 className="type-title text-text-primary mb-6">New Workflow Rule</h1>

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

        <fieldset className="border border-border rounded p-3">
          <legend className="type-label text-text-secondary px-1">Condition (optional)</legend>
          <div className="flex gap-2">
            <input
              placeholder="field (e.g. payload.title)"
              value={conditionField}
              onChange={(e) => setConditionField(e.target.value)}
              className="flex-1 border border-border rounded px-2 py-1 type-body-sm bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <select
              value={conditionOperator}
              onChange={(e) => setConditionOperator(e.target.value)}
              className="border border-border rounded px-2 py-1 type-body-sm bg-bg-surface text-text-primary"
            >
              {["eq", "neq", "contains", "gt", "lt"].map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
            <input
              placeholder="value"
              value={conditionValue}
              onChange={(e) => setConditionValue(e.target.value)}
              className="flex-1 border border-border rounded px-2 py-1 type-body-sm bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </fieldset>

        <div>
          <label className="type-label text-text-primary block mb-1">Action Type *</label>
          <select
            value={actionType}
            onChange={(e) => handleActionTypeChange(e.target.value)}
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
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 accent-brand"
          />
          <label htmlFor="enabled" className="type-body-sm text-text-primary">
            Enable rule immediately
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="type-label bg-brand text-text-inverse px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Rule"}
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
