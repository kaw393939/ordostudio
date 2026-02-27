"use client";

import { useCallback, useEffect, useState } from "react";
import { useDevRole } from "./dev-role-context";

const ALL_ROLES = ["USER", "APPRENTICE", "AFFILIATE", "ADMIN", "SUPER_ADMIN", "MAESTRO"] as const;

interface DevUser {
  id: string;
  email: string;
  roles: string[];
}

export function DevUserSwitcher() {
  const { roleOverride, isOverrideActive, setRoleOverride, clearOverride } = useDevRole();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<DevUser[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch users on first open
  useEffect(() => {
    if (!open || users.length > 0) return;
    fetch("/api/v1/dev/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => {});
  }, [open, users.length]);

  // Fetch current user on mount
  useEffect(() => {
    fetch("/api/v1/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.email) setCurrentUser(data.email);
      })
      .catch(() => {});
  }, []);

  const switchToUser = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/dev/switch-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      if (res.ok) {
        setCurrentUser(email);
        clearOverride();
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }, [clearOverride]);

  const activeLabel = isOverrideActive
    ? `DEV: ${roleOverride?.join(", ")}`
    : currentUser
      ? `DEV: ${currentUser.split("@")[0]}`
      : "DEV";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        zIndex: 99999,
        fontFamily: "monospace",
        fontSize: 12,
      }}
    >
      {/* Collapsed pill */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "6px 12px",
          borderRadius: 20,
          border: isOverrideActive ? "2px solid #eab308" : "1px solid #666",
          background: isOverrideActive ? "#422006" : "#1a1a2e",
          color: "#fff",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {activeLabel}
      </button>

      {/* Expanded panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 0,
            background: "#1a1a2e",
            border: "1px solid #333",
            borderRadius: 8,
            padding: 12,
            minWidth: 260,
            maxHeight: 400,
            overflowY: "auto",
            color: "#e0e0e0",
          }}
        >
          {/* Role overlay section */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: "bold", marginBottom: 6 }}>Role Overlay</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {ALL_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleOverride([role])}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    border:
                      isOverrideActive && roleOverride?.includes(role)
                        ? "1px solid #eab308"
                        : "1px solid #555",
                    background:
                      isOverrideActive && roleOverride?.includes(role)
                        ? "#422006"
                        : "#2a2a3e",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
            {isOverrideActive && (
              <button
                onClick={clearOverride}
                style={{
                  marginTop: 6,
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: "1px solid #ef4444",
                  background: "transparent",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Reset Overlay
              </button>
            )}
          </div>

          {/* Real user section */}
          <div>
            <div style={{ fontWeight: "bold", marginBottom: 6 }}>Switch User</div>
            {users.length === 0 && (
              <div style={{ color: "#888", fontSize: 11 }}>Loading…</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {users.slice(0, 20).map((u) => (
                <button
                  key={u.id}
                  onClick={() => switchToUser(u.email)}
                  disabled={loading}
                  style={{
                    textAlign: "left",
                    padding: "4px 8px",
                    borderRadius: 4,
                    border:
                      currentUser === u.email
                        ? "1px solid #22c55e"
                        : "1px solid transparent",
                    background:
                      currentUser === u.email ? "#052e16" : "transparent",
                    color: "#e0e0e0",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  <span>{u.email}</span>
                  {u.roles.length > 0 && (
                    <span style={{ color: "#888", marginLeft: 6 }}>
                      {u.roles.join(", ")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
