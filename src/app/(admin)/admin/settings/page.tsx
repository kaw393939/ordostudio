"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/primitives";
import { PageShell } from "@/components/layout/page-shell";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/v1/site-settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.settings ?? {});
        setDraft(data.settings ?? {});
        setLoaded(true);
      });
  }, []);

  const handleBlur = async (key: string) => {
    if (draft[key] === settings[key]) return;
    setStatus((s) => ({ ...s, [key]: "saving" }));
    setErrors((e) => ({ ...e, [key]: "" }));
    try {
      const res = await fetch("/api/v1/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: draft[key] }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrors((e) => ({ ...e, [key]: data.detail ?? "Save failed." }));
        setStatus((s) => ({ ...s, [key]: "error" }));
        return;
      }
      const data = await res.json();
      setSettings(data.settings ?? settings);
      setStatus((s) => ({ ...s, [key]: "saved" }));
      setTimeout(() => setStatus((s) => ({ ...s, [key]: "idle" })), 2000);
    } catch {
      setErrors((e) => ({ ...e, [key]: "Network error." }));
      setStatus((s) => ({ ...s, [key]: "error" }));
    }
  };

  return (
    <PageShell
      title="Settings"
      subtitle="Operator-configurable site values. Changes take effect immediately."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Settings" },
      ]}
    >
      <Card className="p-0 overflow-hidden">
        {!loaded ? (
          <p className="p-4 type-body-sm text-text-secondary">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-4 py-2 text-left font-medium text-text-secondary w-64">Key</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Value</th>
                <th className="px-4 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {Object.keys(draft).map((key) => (
                <tr key={key} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-mono text-xs text-text-secondary align-middle">{key}</td>
                  <td className="px-4 py-2">
                    <input
                      className={[
                        "w-full border rounded px-2 py-1 text-sm bg-surface focus:outline-none focus:ring-1",
                        status[key] === "saved"
                          ? "border-green-500 ring-green-300"
                          : status[key] === "error"
                          ? "border-red-500 ring-red-300"
                          : "border-border focus:ring-brand",
                      ].join(" ")}
                      value={draft[key] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [key]: e.target.value }))
                      }
                      onBlur={() => handleBlur(key)}
                    />
                    {errors[key] && (
                      <p className="mt-1 text-xs text-red-600">{errors[key]}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center align-middle">
                    {status[key] === "saving" && (
                      <span className="text-text-secondary text-xs">…</span>
                    )}
                    {status[key] === "saved" && (
                      <span className="text-green-600 text-xs">✓</span>
                    )}
                    {status[key] === "error" && (
                      <span className="text-red-600 text-xs">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </PageShell>
  );
}

