"use client";

import { useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { EmptyState } from "@/components/patterns";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  buildUsersListHref,
  canAddRole,
  canRemoveRole,
  MUTABLE_ROLES,
  normalizeRoles,
} from "@/lib/admin-users-ui";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type UserSummary = {
  id: string;
  email: string;
  status: "ACTIVE" | "DISABLED" | "PENDING";
  roles: string[];
};

type UsersResponse = {
  count: number;
  items: UserSummary[];
};

type UserDetail = UserSummary & {
  _links: Record<string, { href: string }>;
};

type PendingConfirmation =
  | { kind: "status"; user: UserDetail; nextStatus: UserSummary["status"] }
  | { kind: "add-role"; user: UserDetail; role: string }
  | { kind: "remove-role"; user: UserDetail; role: string }
  | null;

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [confirmAction, setConfirmAction] = useState<PendingConfirmation>(null);

  const usersHref = useMemo(() => buildUsersListHref({ search, status, role }), [search, status, role]);

  const loadUsers = async () => {
    setPending(true);
    const listResult = await requestHal<UsersResponse>(usersHref);
    if (!listResult.ok) {
      setProblem(listResult.problem);
      setPending(false);
      return;
    }

    setProblem(null);
    setUsers(listResult.data.items ?? []);
    setSelectedUser((current) => {
      if (!current) {
        return null;
      }
      const stillPresent = (listResult.data.items ?? []).some((row) => row.id === current.id);
      return stillPresent ? current : null;
    });
    setPending(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersHref]);

  const loadUserDetail = async (userId: string) => {
    setPending(true);
    const detailResult = await requestHal<UserDetail>(`/api/v1/users/${userId}`);
    if (!detailResult.ok) {
      setProblem(detailResult.problem);
      setPending(false);
      return;
    }

    setProblem(null);
    setSelectedUser(detailResult.data);
    setPending(false);
  };

  const updateStatus = async (args: { user: UserDetail; nextStatus: UserSummary["status"] }) => {
    setPending(true);
    const result = await requestHal<unknown>(`/api/v1/users/${args.user.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: args.nextStatus, confirm: true }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    await loadUsers();
    await loadUserDetail(args.user.id);
    setPending(false);
  };

  const addRole = async (args: { user: UserDetail; role: string }) => {
    setPending(true);
    const result = await requestHal<unknown>(`/api/v1/users/${args.user.id}/roles`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ role: args.role, confirm: true }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    await loadUserDetail(args.user.id);
    setPending(false);
  };

  const removeRole = async (args: { user: UserDetail; role: string }) => {
    setPending(true);
    const result = await requestHal<unknown>(`/api/v1/users/${args.user.id}/roles/${args.role}?confirm=true`, {
      method: "DELETE",
    });

    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    await loadUserDetail(args.user.id);
    setPending(false);
  };

  const onConfirm = async () => {
    const action = confirmAction;
    if (!action) {
      return;
    }

    setConfirmAction(null);

    if (action.kind === "status") {
      await updateStatus({ user: action.user, nextStatus: action.nextStatus });
      return;
    }

    if (action.kind === "add-role") {
      await addRole({ user: action.user, role: action.role });
      return;
    }

    await removeRole({ user: action.user, role: action.role });
  };

  const selectedRoles = selectedUser ? normalizeRoles(selectedUser.roles) : [];

  return (
    <PageShell
      title="Users"
      subtitle="Search, manage status, and roles."
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users" }]}
    >

      <section className="mt-4 rounded-md border p-4">
        <h2 className="text-sm font-medium">Search and filters</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="user-search">Search by email</Label>
            <Input
              id="user-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="e.g., john@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-status">Status filter</Label>
            <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
              <SelectTrigger id="user-status" className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="DISABLED">DISABLED</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-role">Role filter</Label>
            <Select value={role || "all"} onValueChange={(value) => setRole(value === "all" ? "" : value)}>
              <SelectTrigger id="user-role" className="w-full">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="USER">USER</SelectItem>
                <SelectItem value="AFFILIATE">AFFILIATE</SelectItem>
                <SelectItem value="APPRENTICE">APPRENTICE</SelectItem>
                <SelectItem value="MAESTRO">MAESTRO</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void loadUsers()} disabled={pending}>
            {pending ? "Loading..." : "Refresh"}
          </Button>
          <p className="type-meta text-text-muted">Auto-loads on filter changes.</p>
        </div>
      </section>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      <section className="mt-4 rounded-md border p-4">
        <h2 className="text-sm font-medium">Users ({users.length})</h2>
        {users.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<UserPlus className="size-5" />}
              title="No users loaded"
              description="Run a search or load the current user list to get started."
              action={
                <Button variant="outline" onClick={() => void loadUsers()} disabled={pending}>
                  {pending ? "Loading..." : "Load users"}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Roles</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="py-2">{user.email}</td>
                    <td className="py-2">{user.status}</td>
                    <td className="py-2">{normalizeRoles(user.roles).join(", ")}</td>
                    <td className="py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void loadUserDetail(user.id)}
                        disabled={pending}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedUser ? (
        <section className="mt-4 rounded-md border p-4">
          <h2 className="text-sm font-medium">User detail</h2>
          <p className="mt-1 text-sm">{selectedUser.email}</p>
          <p className="text-xs text-zinc-500">{selectedUser.id}</p>

          <div className="mt-3">
            <p className="text-sm font-medium">Status</p>
            <div className="mt-2 flex gap-2">
              {(["ACTIVE", "DISABLED", "PENDING"] as const).map((nextStatus) => (
                <Button
                  key={nextStatus}
                  variant="outline"
                  size="sm"
                  disabled={pending || selectedUser.status === nextStatus}
                  onClick={() => setConfirmAction({ kind: "status", user: selectedUser, nextStatus })}
                >
                  Set {nextStatus}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium">Roles</p>
            <p className="mt-1 text-xs text-zinc-500">SUPER_ADMIN role mutations are intentionally hidden.</p>
            <div className="mt-2 flex gap-2">
              {selectedRoles.map((existingRole) => (
                <span key={existingRole} className="rounded border px-2 py-1 text-xs">
                  {existingRole}
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              {MUTABLE_ROLES.map((mutableRole) => (
                <Button
                  key={`add-${mutableRole}`}
                  variant="outline"
                  size="sm"
                  disabled={pending || !canAddRole(selectedRoles, mutableRole)}
                  onClick={() => setConfirmAction({ kind: "add-role", user: selectedUser, role: mutableRole })}
                >
                  Add {mutableRole}
                </Button>
              ))}
              {MUTABLE_ROLES.map((mutableRole) => (
                <Button
                  key={`remove-${mutableRole}`}
                  variant="outline"
                  size="sm"
                  disabled={pending || !canRemoveRole(selectedRoles, mutableRole)}
                  onClick={() => setConfirmAction({ kind: "remove-role", user: selectedUser, role: mutableRole })}
                >
                  Remove {mutableRole}
                </Button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => (open ? null : setConfirmAction(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.kind === "status"
                ? "Confirm status change"
                : confirmAction?.kind === "add-role"
                  ? "Confirm role add"
                  : "Confirm role removal"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.kind === "status"
                ? `Change ${confirmAction.user.email} from ${confirmAction.user.status} to ${confirmAction.nextStatus}?`
                : confirmAction?.kind === "add-role"
                  ? `Add role ${confirmAction.role} to ${confirmAction.user.email}?`
                  : confirmAction
                    ? `Remove role ${confirmAction.role} from ${confirmAction.user.email}?`
                    : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              variant={confirmAction?.kind === "remove-role" || confirmAction?.kind === "status" ? "destructive" : "default"}
              onClick={() => void onConfirm()}
            >
              {confirmAction?.kind === "status"
                ? "Confirm status"
                : confirmAction?.kind === "add-role"
                  ? "Add role"
                  : "Remove role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
