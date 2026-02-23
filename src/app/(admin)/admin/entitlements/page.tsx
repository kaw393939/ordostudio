"use client";

import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type EntitlementStatus = "GRANTED" | "REVOKED";

type EntitlementRecord = {
  id: string;
  user_id: string;
  entitlement_key: string;
  status: EntitlementStatus;
  reason: string | null;
  granted_at: string | null;
  revoked_at: string | null;
  updated_at: string;
};

type ListResponse = {
  count: number;
  items: EntitlementRecord[];
};

export default function AdminEntitlementsPage() {
  const [pending, setPending] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [items, setItems] = useState<EntitlementRecord[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [form, setForm] = useState({
    action: "grant" as "grant" | "revoke",
    user_id: "",
    entitlement_key: "",
    reason: "",
  });

  const [discordLink, setDiscordLink] = useState({
    user_id: "",
    discord_user_id: "",
  });

  useEffect(() => {
    const load = async () => {
      setPending(true);
      const response = await requestHal<ListResponse>("/api/v1/admin/entitlements");
      if (!response.ok) {
        setProblem(response.problem);
        setItems([]);
        setPending(false);
        return;
      }

      setProblem(null);
      setItems(response.data.items ?? []);
      setPending(false);
    };

    void load();
  }, [refreshKey]);

  const submitEntitlement = async () => {
    setSaving(true);
    setProblem(null);

    const response = await requestHal<unknown>("/api/v1/admin/entitlements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: form.action,
        user_id: form.user_id,
        entitlement_key: form.entitlement_key,
        reason: form.reason.trim().length > 0 ? form.reason : null,
      }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setSaving(false);
      return;
    }

    setForm((prev) => ({ ...prev, reason: "" }));
    setRefreshKey((k) => k + 1);
    setSaving(false);
  };

  const submitDiscordLink = async () => {
    setSaving(true);
    setProblem(null);

    const response = await requestHal<unknown>("/api/v1/admin/entitlements/discord-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        user_id: discordLink.user_id,
        discord_user_id: discordLink.discord_user_id,
      }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setSaving(false);
      return;
    }

    setDiscordLink({ user_id: "", discord_user_id: "" });
    setRefreshKey((k) => k + 1);
    setSaving(false);
  };

  return (
    <PageShell title="Entitlements" subtitle="Grant/revoke access keys and (optionally) link Discord accounts." breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Entitlements" }]}>
      {problem ? (
        <div className="mb-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <Card className="p-4">
        <h2 className="type-title">Grant / revoke</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ent-action">Action</Label>
            <Select value={form.action} onValueChange={(value) => setForm((prev) => ({ ...prev, action: value as "grant" | "revoke" }))}>
              <SelectTrigger id="ent-action" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grant">Grant</SelectItem>
                <SelectItem value="revoke">Revoke</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ent-key">Entitlement key</Label>
            <Input id="ent-key" value={form.entitlement_key} onChange={(e) => setForm((prev) => ({ ...prev, entitlement_key: e.target.value }))} placeholder="e.g., COMMUNITY" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ent-user">User id</Label>
            <Input id="ent-user" value={form.user_id} onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))} placeholder="usr_..." />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ent-reason">Reason (optional)</Label>
            <Input id="ent-reason" value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason" />
          </div>
        </div>

        <Button intent="primary" className="mt-3" onClick={() => void submitEntitlement()} disabled={saving}>
          {saving ? "Saving…" : "Submit"}
        </Button>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="type-title">Discord link (optional)</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="discord-user">User id</Label>
            <Input id="discord-user" value={discordLink.user_id} onChange={(e) => setDiscordLink((prev) => ({ ...prev, user_id: e.target.value }))} placeholder="usr_..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="discord-id">Discord user id</Label>
            <Input id="discord-id" value={discordLink.discord_user_id} onChange={(e) => setDiscordLink((prev) => ({ ...prev, discord_user_id: e.target.value }))} placeholder="123456789012345678" />
          </div>
        </div>

        <Button intent="secondary" className="mt-3" onClick={() => void submitDiscordLink()} disabled={saving}>
          {saving ? "Saving…" : "Link Discord"}
        </Button>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="type-title">Recent entitlements</h2>
        {pending ? <p className="mt-2 type-meta text-text-muted">Loading…</p> : null}
        {!pending && items.length === 0 ? <p className="mt-2 type-meta text-text-muted">No entitlements yet.</p> : null}
        {items.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-sm border border-border-default p-3">
                <p className="type-label">
                  {item.entitlement_key} · {item.status}
                </p>
                <p className="type-meta text-text-muted">user={item.user_id}</p>
                <p className="type-meta text-text-muted">updated={item.updated_at}</p>
                {item.reason ? <p className="type-meta text-text-muted">reason={item.reason}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </PageShell>
  );
}
