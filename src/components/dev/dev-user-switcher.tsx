"use client";

import { useCallback, useEffect, useState } from "react";

interface DevUser {
  id: string;
  email: string;
  roles: string[];
}

export function DevUserSwitcher() {
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
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const activeLabel = currentUser
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
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "6px 12px",
          borderRadius: 20,
          border: "1px solid #666",
          background: "#1a1a2e",
          color: "#fff",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {activeLabel}
      </button>

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
      )}
    </div>
  );
}
