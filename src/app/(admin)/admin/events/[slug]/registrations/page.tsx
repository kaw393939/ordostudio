"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Breadcrumbs, EmptyState } from "@/components/patterns";
import { Button, Card, Input } from "@/components/primitives";
import { ProblemDetailsPanel } from "@/components/problem-details";
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
import { nowISO } from "@/lib/date-time";
import {
  buildRegistrationPayload,
  canCancel,
  canCheckIn,
  type RegistrationStatus,
} from "@/lib/admin-registration-view";
import {
  actionGuidance,
  bulkEligibleForCancel,
  bulkEligibleForCheckin,
  filterRegistrations,
  type RegistrationStatusFilter,
} from "@/lib/admin-operations-ui";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type RegistrationItem = {
  id: string;
  user_id: string;
  user_email: string;
  status: RegistrationStatus;
};

type RegistrationsResponse = {
  count: number;
  items: RegistrationItem[];
};

type BulkOperationReport = {
  action: "checkin" | "cancel";
  timestamp: string;
  totalSelected: number;
  eligibleCount: number;
  processedCount: number;
  failures: Array<{ userId: string; reason: string }>;
};

type PendingBulkConfirmation = {
  action: "checkin" | "cancel";
  eligibleIds: string[];
  totalSelected: number;
} | null;

export default function AdminEventRegistrationsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [identifier, setIdentifier] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RegistrationStatusFilter>("all");
  const [checkInMode, setCheckInMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [bulkReport, setBulkReport] = useState<BulkOperationReport | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<PendingBulkConfirmation>(null);

  const registrationsHref = useMemo(() => {
    if (!slug) {
      return null;
    }
    return `/api/v1/events/${slug}/registrations`;
  }, [slug]);

  const visibleRegistrations = useMemo(
    () => filterRegistrations(registrations, searchQuery, statusFilter),
    [registrations, searchQuery, statusFilter],
  );

  const selectedVisibleIds = useMemo(
    () => selectedUserIds.filter((userId) => visibleRegistrations.some((item) => item.user_id === userId)),
    [selectedUserIds, visibleRegistrations],
  );

  const loadRegistrations = async () => {
    if (!registrationsHref) {
      return;
    }

    setProblem(null);
    const result = await requestHal<RegistrationsResponse>(registrationsHref);
    if (!result.ok) {
      setProblem(result.problem);
      return;
    }

    setRegistrations(result.data.items ?? []);
  };

  useEffect(() => {
    if (!registrationsHref) {
      return;
    }

    let cancelled = false;

    void requestHal<RegistrationsResponse>(registrationsHref).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setProblem(result.problem);
        return;
      }

      setRegistrations(result.data.items ?? []);
    });

    return () => {
      cancelled = true;
    };
  }, [registrationsHref]);

  const addRegistration = async () => {
    if (!registrationsHref) {
      return;
    }

    const payload = buildRegistrationPayload(identifier);
    if (!payload.user_email && !payload.user_id) {
      return;
    }

    setPending(true);
    setProblem(null);

    const result = await requestHal<unknown>(registrationsHref, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    setIdentifier("");
    await loadRegistrations();
    setFeedback("Registration added.");
    setPending(false);
    window.setTimeout(() => setFeedback(null), 2200);
  };

  const cancelRegistration = async (userId: string) => {
    if (!slug) {
      return;
    }

    setPending(true);
    setProblem(null);
    const result = await requestHal<unknown>(`/api/v1/events/${slug}/registrations/${userId}`, {
      method: "DELETE",
    });

    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    await loadRegistrations();
    setFeedback("Registration canceled.");
    setPending(false);
    window.setTimeout(() => setFeedback(null), 2200);
  };

  const checkInRegistration = async (userId: string) => {
    if (!slug) {
      return;
    }

    setPending(true);
    setProblem(null);
    const result = await requestHal<unknown>(`/api/v1/events/${slug}/checkins`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      setPending(false);
      return;
    }

    await loadRegistrations();
    setFeedback("Check-in recorded.");
    setPending(false);
    window.setTimeout(() => setFeedback(null), 2200);
  };

  const executeBulkCheckIn = async (args: { eligibleIds: string[]; totalSelected: number }) => {
    if (!slug) {
      return;
    }

    setPending(true);
    setProblem(null);
    let processed = 0;
    const failures: Array<{ userId: string; reason: string }> = [];

    for (const userId of args.eligibleIds) {
      const result = await requestHal<unknown>(`/api/v1/events/${slug}/checkins`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ user_id: userId }),
      });
      if (result.ok) {
        processed += 1;
      } else {
        failures.push({
          userId,
          reason: result.problem.detail ?? result.problem.title,
        });
      }
    }

    await loadRegistrations();
    setSelectedUserIds([]);
    setPending(false);
    setFeedback(`${processed} attendee(s) checked in.`);
    setBulkReport({
      action: "checkin",
      timestamp: nowISO(),
      totalSelected: args.totalSelected,
      eligibleCount: args.eligibleIds.length,
      processedCount: processed,
      failures,
    });
    window.setTimeout(() => setFeedback(null), 2200);
  };

  const bulkCheckIn = () => {
    const eligibleIds = bulkEligibleForCheckin(visibleRegistrations, selectedVisibleIds);
    setBulkReport(null);
    if (eligibleIds.length === 0 || !slug) {
      setFeedback("No selected attendees are eligible for check-in.");
      window.setTimeout(() => setFeedback(null), 2200);
      return;
    }

    setBulkConfirm({
      action: "checkin",
      eligibleIds,
      totalSelected: selectedVisibleIds.length,
    });
  };

  const executeBulkCancel = async (args: { eligibleIds: string[]; totalSelected: number }) => {
    if (!slug) {
      return;
    }

    setPending(true);
    setProblem(null);
    let processed = 0;
    const failures: Array<{ userId: string; reason: string }> = [];

    for (const userId of args.eligibleIds) {
      const result = await requestHal<unknown>(`/api/v1/events/${slug}/registrations/${userId}`, {
        method: "DELETE",
      });
      if (result.ok) {
        processed += 1;
      } else {
        failures.push({
          userId,
          reason: result.problem.detail ?? result.problem.title,
        });
      }
    }

    await loadRegistrations();
    setSelectedUserIds([]);
    setPending(false);
    setFeedback(`${processed} attendee(s) canceled.`);
    setBulkReport({
      action: "cancel",
      timestamp: nowISO(),
      totalSelected: args.totalSelected,
      eligibleCount: args.eligibleIds.length,
      processedCount: processed,
      failures,
    });
    window.setTimeout(() => setFeedback(null), 2200);
  };

  const bulkCancel = () => {
    const eligibleIds = bulkEligibleForCancel(visibleRegistrations, selectedVisibleIds);
    setBulkReport(null);
    if (eligibleIds.length === 0 || !slug) {
      setFeedback("No selected attendees are eligible for cancellation.");
      window.setTimeout(() => setFeedback(null), 2200);
      return;
    }

    setBulkConfirm({
      action: "cancel",
      eligibleIds,
      totalSelected: selectedVisibleIds.length,
    });
  };

  return (
    <main id="main-content" className="container-grid py-6">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Events", href: "/admin/events" },
          { label: slug ?? "Event", href: `/admin/events/${slug}` },
          { label: "Registrations" },
        ]}
      />

      <h1 className="type-h2">Event Registrations</h1>
      <p className="type-body-sm text-text-secondary">Event slug: {slug}</p>

      <Card className="mt-4 p-4">
        <h2 className="type-title">Add registration</h2>
        <div className="mt-2 flex gap-2">
          <Input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="User ID or email"
            aria-label="User identifier"
          />
          <Button type="button" onClick={() => void addRegistration()} disabled={pending} intent="primary">
            {pending ? "Working..." : "Add"}
          </Button>
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="type-title">Operations</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by email or user ID"
            aria-label="Search registrations"
          />
          <label className="type-label text-text-secondary">
            Status filter
            <select
              className="mt-1 w-full rounded-sm border border-border-default bg-surface px-3 py-2 type-body-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as RegistrationStatusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="REGISTERED">Registered</option>
              <option value="WAITLISTED">Waitlisted</option>
              <option value="CHECKED_IN">Checked-in</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            intent={checkInMode ? "primary" : "secondary"}
            onClick={() => setCheckInMode((current) => !current)}
          >
            {checkInMode ? "Check-in mode: on" : "Check-in mode: off"}
          </Button>
          <Button type="button" intent="secondary" disabled={pending} onClick={() => void bulkCheckIn()}>
            Bulk check-in ({bulkEligibleForCheckin(visibleRegistrations, selectedVisibleIds).length})
          </Button>
          <Button type="button" intent="secondary" disabled={pending} onClick={() => void bulkCancel()}>
            Bulk cancel ({bulkEligibleForCancel(visibleRegistrations, selectedVisibleIds).length})
          </Button>
        </div>
      </Card>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {feedback ? (
        <div className="mt-4 rounded-sm border border-state-success bg-surface px-3 py-2 type-label text-state-success">
          {feedback}
        </div>
      ) : null}

      {bulkReport ? (
        <Card className="mt-4 p-4">
          <h2 className="type-title">Last bulk operation summary</h2>
          <p className="mt-2 type-body-sm text-text-secondary">
            Action: {bulkReport.action === "checkin" ? "Bulk check-in" : "Bulk cancel"} · Timestamp: {bulkReport.timestamp}
          </p>
          <p className="type-body-sm text-text-secondary">
            Selected: {bulkReport.totalSelected} · Eligible: {bulkReport.eligibleCount} · Processed: {bulkReport.processedCount}
          </p>
          <p className="type-body-sm text-text-secondary">Failures: {bulkReport.failures.length}</p>
          {bulkReport.failures.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 type-meta text-text-muted">
              {bulkReport.failures.map((failure) => (
                <li key={`${failure.userId}-${failure.reason}`}>{failure.userId}: {failure.reason}</li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <Card className="mt-4 p-4">
        <h2 className="type-title">Registrations ({visibleRegistrations.length})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm" aria-label="Event registrations table">
            <caption className="sr-only">Filtered registrations with check-in and cancellation actions</caption>
            <thead>
              <tr>
                <th scope="col" className="pb-2">Select</th>
                <th scope="col" className="pb-2">User</th>
                <th scope="col" className="pb-2">Status</th>
                <th scope="col" className="pb-2">Actions</th>
                <th scope="col" className="pb-2">Guidance</th>
              </tr>
            </thead>
            <tbody>
              {visibleRegistrations.map((registration) => {
                const selected = selectedUserIds.includes(registration.user_id);
                const guidance = actionGuidance(registration.status);
                return (
                <tr key={registration.id} className="border-t">
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      aria-label={`Select ${registration.user_email}`}
                      onChange={(event) => {
                        setSelectedUserIds((current) =>
                          event.target.checked
                            ? [...current, registration.user_id]
                            : current.filter((id) => id !== registration.user_id),
                        );
                      }}
                    />
                  </td>
                  <td className="py-2">
                    <p>{registration.user_email}</p>
                    <p className="type-meta text-text-muted">{registration.user_id}</p>
                  </td>
                  <td className="py-2">{registration.status}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        intent={checkInMode ? "primary" : "secondary"}
                        disabled={pending || !canCheckIn(registration.status)}
                        onClick={() => void checkInRegistration(registration.user_id)}
                      >
                        Check-in
                      </Button>
                      <Button
                        type="button"
                        intent="secondary"
                        disabled={pending || !canCancel(registration.status)}
                        onClick={() => void cancelRegistration(registration.user_id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </td>
                  <td className="py-2 type-meta text-text-muted">
                    {checkInMode ? guidance.checkin : guidance.cancel}
                  </td>
                </tr>
                );
              })}
              {visibleRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-3">
                    <EmptyState
                      title="No registrations match current filters"
                      description="Adjust search or status to find attendees faster."
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <AlertDialog
        open={bulkConfirm !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBulkConfirm(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirm?.action === "cancel" ? "Confirm bulk cancel" : "Confirm bulk check-in"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkConfirm?.action === "cancel"
                ? `Cancel ${bulkConfirm.eligibleIds.length} eligible registration(s)? This sets status to CANCELLED.`
                : `Check in ${bulkConfirm?.eligibleIds.length ?? 0} eligible attendee(s)?`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending || bulkConfirm === null}
              variant={bulkConfirm?.action === "cancel" ? "destructive" : "default"}
              onClick={() => {
                const action = bulkConfirm;
                if (!action) {
                  return;
                }
                setBulkConfirm(null);
                if (action.action === "cancel") {
                  void executeBulkCancel({ eligibleIds: action.eligibleIds, totalSelected: action.totalSelected });
                } else {
                  void executeBulkCheckIn({ eligibleIds: action.eligibleIds, totalSelected: action.totalSelected });
                }
              }}
            >
              {bulkConfirm?.action === "cancel" ? "Cancel registrations" : "Check in attendees"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
