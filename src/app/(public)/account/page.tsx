"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { EmptyState } from "@/components/patterns";
import { Button, Card } from "@/components/primitives";
import { PageShell } from "@/components/layout/page-shell";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label, RelativeTime } from "@/components/forms";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaggerContainer, StaggerItem } from "@/components/ui/motion-wrapper";
import { buildGoogleCalendarUrl } from "@/lib/calendar-links";
import { timelineStatusLabel } from "@/lib/client-engagement-ui";
import { formatAbsolute, formatDateTime, parseISO } from "@/lib/date-time";
import { formatEventPrimaryRange, formatTimeZoneLabel } from "@/lib/event-date-ui";
import { normalizeRegistrationStatus, statusChipClass } from "@/lib/event-detail-action";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import { useFeatureFlag } from "@/components/feature-flags-provider";
import { ReferralCard } from "./referral-card";

type MeResponse = {
  id: string;
  email: string;
  status: string;
  roles: string[];
  last_login_at: string | null;
  _links: Record<string, { href: string }>;
};

type StripeConnectStatusResponse = {
  status: "NOT_STARTED" | "PENDING" | "COMPLETE";
  stripe_account_id: string | null;
  details_submitted: number | null;
  charges_enabled: number | null;
  payouts_enabled: number | null;
  last_checked_at: string | null;
};

type AccountRegistration = {
  registration_id: string;
  event_id: string;
  event_slug: string;
  event_title: string;
  event_status: string;
  start_at: string;
  end_at: string;
  timezone: string;
  delivery_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  engagement_type: "INDIVIDUAL" | "GROUP";
  location_text: string | null;
  meeting_url: string | null;
  instructor_state: "TBA" | "PROPOSED" | "ASSIGNED" | "CONFIRMED" | "REASSIGNED";
  instructor_name: string | null;
  how_to_attend?: string;
  status: string;
  _links?: Record<string, { href: string }>;
};

type AccountRegistrationsResponse = {
  count: number;
  items: AccountRegistration[];
};

type EngagementTimelineItem = {
  registration_id: string;
  event_slug: string;
  event_title: string;
  start_at: string;
  timezone: string;
  timeline_status: "UPCOMING" | "DELIVERED" | "CANCELLED";
  outcomes_count: number;
  open_action_items: number;
  blocked_action_items: number;
  artifacts_count: number;
  pending_reminders: number;
  next_step: string | null;
  feedback_submitted: boolean;
};

type FollowUpAction = {
  id: string;
  session_id?: string;
  session_title?: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "BLOCKED";
  due_at: string | null;
  owner_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

type FollowUpReminder = {
  id: string;
  action_item_id: string;
  reminder_type: "UPCOMING" | "OVERDUE";
  reminder_for: string;
  status: "PENDING" | "ACKNOWLEDGED";
  acknowledged_at?: string | null;
  created_at?: string;
};

type FollowUpResponse = {
  actions_count: number;
  reminders_count: number;
  actions: FollowUpAction[];
  reminders: FollowUpReminder[];
};

type AccountEngagementsResponse = {
  count: number;
  items: EngagementTimelineItem[];
};

type AttentionSummaryResponse = {
  open_actions: number;
  overdue_actions: number;
  pending_reminders: number;
  badge_count: number;
};

type AccountActivityEntry = {
  id: string;
  action: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type AccountActivityResponse = {
  count: number;
  items: AccountActivityEntry[];
};

const clamp = (value: number): number => Math.min(100, Math.max(0, value));

const daysBetween = (fromMs: number, toMs: number): number => Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));

const dueTone = (args: { dueAtIso: string | null; nowMs: number }): "success" | "warning" | "destructive" => {
  if (!args.dueAtIso) {
    return "success";
  }
  const dueMs = parseISO(args.dueAtIso).getTime();
  if (dueMs < args.nowMs) {
    return "destructive";
  }
  if (dueMs - args.nowMs <= 48 * 60 * 60 * 1000) {
    return "warning";
  }
  return "success";
};

const dueAccentClass = (tone: ReturnType<typeof dueTone>): string => {
  switch (tone) {
    case "destructive":
      return "border-l-4 border-state-danger";
    case "warning":
      return "border-l-4 border-state-warning";
    case "success":
    default:
      return "border-l-4 border-border";
  }
};

const prettyActivity = (action: string): string => {
  if (action === "api.auth.login") return "Signed in";
  if (action === "api.auth.logout") return "Signed out";
  if (action === "api.registration.add") return "Registered for an event";
  if (action === "api.registration.remove") return "Cancelled a registration";
  if (action === "api.engagement.followup.update") return "Updated a follow-up";
  if (action === "api.engagement.reminder.acknowledge") return "Acknowledged a reminder";
  if (action === "api.engagement.reminder.snooze") return "Snoozed a reminder";
  if (action === "api.engagement.feedback.submit") return "Submitted feedback";
  return action;
};

export default function AccountPage() {
  const UNDO_MS = 8_000;
  const undoEnabled = useFeatureFlag("UNDO_DELETE");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [registrations, setRegistrations] = useState<AccountRegistration[]>([]);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "registrations" | "followups" | "feedback" | "referrals">("overview");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [registrationSort, setRegistrationSort] = useState<"date" | "status">("date");
  const [engagements, setEngagements] = useState<EngagementTimelineItem[]>([]);
  const [submittingFeedbackSlug, setSubmittingFeedbackSlug] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [followUpBySlug, setFollowUpBySlug] = useState<Record<string, FollowUpResponse>>({});
  const [loadedAllFollowUps, setLoadedAllFollowUps] = useState(false);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [updatingActionKey, setUpdatingActionKey] = useState<string | null>(null);
  const [acknowledgingReminderKey, setAcknowledgingReminderKey] = useState<string | null>(null);
  const [attentionSummary, setAttentionSummary] = useState<AttentionSummaryResponse | null>(null);
  const [activity, setActivity] = useState<AccountActivityEntry[]>([]);
  const [stripeConnect, setStripeConnect] = useState<StripeConnectStatusResponse | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);

  // Apprentice learning path progress
  type ApprenticeProgressData = {
    currentLevel: { slug: string; name: string; min_gate_projects: number; min_vocabulary: number; human_edge_focus: string | null } | null;
    levels: { slug: string; name: string; ordinal: number }[];
    gateProjects: { id: string; title: string; level_slug: string }[];
    submissions: { id: string; gate_project_id: string; status: string }[];
    vocabularyCount: number;
    nextGate: { title: string; estimated_hours: number | null } | null;
  };
  const [apprenticeProgress, setApprenticeProgress] = useState<ApprenticeProgressData | null>(null);
  const [apprenticeHandle, setApprenticeHandle] = useState<string | null>(null);

  const pendingUndoRef = useRef(new Map<string, { undone: boolean; timeoutId: ReturnType<typeof setTimeout> }>());

  useEffect(() => {
    const pendingUndo = pendingUndoRef.current;
    return () => {
      for (const pending of pendingUndo.values()) {
        clearTimeout(pending.timeoutId);
      }
      pendingUndo.clear();
    };
  }, []);

  const undoToastDescription = (detail: string) => (
    <div className="mt-1 space-y-2">
      <p className="type-meta text-text-muted">{detail}</p>
      <div className="h-1 w-full overflow-hidden rounded-sm bg-muted" aria-hidden>
        <div className="h-full bg-warning undo-countdown" style={{ animationDuration: `${UNDO_MS}ms` }} />
      </div>
    </div>
  );

  const startUndoableCommit = (args: {
    key: string;
    toastTitle: string;
    toastDetail: string;
    optimistic: () => void;
    rollback: () => void;
    commit: () => Promise<{ ok: true } | { ok: false; problem?: ProblemDetails }>;
    onCommitted?: () => Promise<void> | void;
    commitErrorToast?: string;
    undoToast?: string;
  }) => {
    const existing = pendingUndoRef.current.get(args.key);
    if (existing) {
      existing.undone = true;
      clearTimeout(existing.timeoutId);
      pendingUndoRef.current.delete(args.key);
    }

    args.optimistic();

    const pending = { undone: false, timeoutId: setTimeout(() => {}, 0) };

    const toastId = toast.success(args.toastTitle, {
      duration: UNDO_MS,
      description: undoToastDescription(args.toastDetail),
      action: {
        label: "Undo",
        onClick: () => {
          const found = pendingUndoRef.current.get(args.key);
          if (!found) return;
          found.undone = true;
          clearTimeout(found.timeoutId);
          pendingUndoRef.current.delete(args.key);

          args.rollback();
          toast.dismiss(toastId);
          toast.success(args.undoToast ?? "Undone.");
        },
      },
    });

    pending.timeoutId = setTimeout(async () => {
      const found = pendingUndoRef.current.get(args.key);
      if (!found || found.undone) return;
      pendingUndoRef.current.delete(args.key);

      const result = await args.commit();
      if (!result.ok) {
        args.rollback();
        setProblem(result.problem ?? null);
        toast.error(args.commitErrorToast ?? "Unable to save changes.");
        return;
      }

      await args.onCommitted?.();
    }, UNDO_MS);

    pendingUndoRef.current.set(args.key, pending);
  };

  const [nowMs] = useState(() => Date.now());
  const upcomingRegistrations = registrations
    .filter((item) => {
      try {
        return parseISO(item.start_at).getTime() > nowMs && normalizeRegistrationStatus(item.status) !== "CANCELLED";
      } catch {
        return false;
      }
    })
    .sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime());
  const nextRegistration = upcomingRegistrations[0] ?? null;
  const attentionCount = attentionSummary?.badge_count ?? 0;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setProblem(null);

      const result = await requestHal<MeResponse>("/api/v1/me");
      if (!result.ok) {
        setProblem(result.problem);
        setLoading(false);
        return;
      }

      setMe(result.data);

      const connectStatus = await requestHal<StripeConnectStatusResponse>("/api/v1/account/stripe-connect");
      if (connectStatus.ok) {
        setStripeConnect(connectStatus.data);
      }

      const history = await requestHal<AccountRegistrationsResponse>("/api/v1/account/registrations");
      if (history.ok) {
        setRegistrations(history.data.items ?? []);
      }

      const engagementTimeline = await requestHal<AccountEngagementsResponse>("/api/v1/account/engagements");
      if (engagementTimeline.ok) {
        setEngagements(engagementTimeline.data.items ?? []);
      }

      const attention = await requestHal<AttentionSummaryResponse>("/api/v1/account/attention");
      if (attention.ok) {
        setAttentionSummary(attention.data);
      }

      const activityFeed = await requestHal<AccountActivityResponse>("/api/v1/account/activity");
      if (activityFeed.ok) {
        setActivity(activityFeed.data.items ?? []);
      }

      // Apprentice learning path progress — fetch if user has an apprentice profile
      const apprenticeProfile = await requestHal<{ handle: string }>("/api/v1/account/apprentice-profile");
      if (apprenticeProfile.ok && apprenticeProfile.data.handle) {
        const handle = apprenticeProfile.data.handle;
        setApprenticeHandle(handle);
        const progressRes = await requestHal<ApprenticeProgressData>(`/api/v1/apprentices/${handle}/progress`);
        if (progressRes.ok) {
          setApprenticeProgress(progressRes.data);
        }
      }

      setLoading(false);
    };

    void load();
  }, []);

  const refreshAttention = async () => {
    const attention = await requestHal<AttentionSummaryResponse>("/api/v1/account/attention");
    if (attention.ok) {
      setAttentionSummary(attention.data);
    }
  };

  const refreshRegistrations = async () => {
    const history = await requestHal<AccountRegistrationsResponse>("/api/v1/account/registrations");
    if (history.ok) {
      setRegistrations(history.data.items ?? []);
    }
  };

  const loadAllFollowUps = async () => {
    if (loadingFollowUps || loadedAllFollowUps || engagements.length === 0) {
      return;
    }

    setLoadingFollowUps(true);
    setProblem(null);

    const results = await Promise.all(
      engagements.map(async (engagement) => {
        const result = await requestHal<FollowUpResponse>(`/api/v1/account/engagements/${engagement.event_slug}/follow-up`);
        return { slug: engagement.event_slug, result };
      }),
    );

    const next: Record<string, FollowUpResponse> = {};
    for (const entry of results) {
      if (entry.result.ok) {
        next[entry.slug] = entry.result.data;
      }
    }

    setFollowUpBySlug((current) => ({
      ...current,
      ...next,
    }));
    setLoadedAllFollowUps(true);
    setLoadingFollowUps(false);
  };

  useEffect(() => {
    if (activeTab === "followups") {
      void loadAllFollowUps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const allFollowUpActions = useMemo(() => {
    const rows: Array<{
      slug: string;
      title: string;
      action: FollowUpAction;
    }> = [];
    for (const engagement of engagements) {
      const followUp = followUpBySlug[engagement.event_slug];
      if (!followUp) continue;
      for (const action of followUp.actions) {
        rows.push({ slug: engagement.event_slug, title: engagement.event_title, action });
      }
    }
    return rows;
  }, [engagements, followUpBySlug]);

  const allReminders = useMemo(() => {
    const rows: Array<{
      slug: string;
      title: string;
      reminder: FollowUpReminder;
    }> = [];
    for (const engagement of engagements) {
      const followUp = followUpBySlug[engagement.event_slug];
      if (!followUp) continue;
      for (const reminder of followUp.reminders) {
        rows.push({ slug: engagement.event_slug, title: engagement.event_title, reminder });
      }
    }
    return rows;
  }, [engagements, followUpBySlug]);

  const pendingReminderRows = useMemo(
    () => allReminders.filter((row) => row.reminder.status === "PENDING").sort((a, b) => a.reminder.reminder_for.localeCompare(b.reminder.reminder_for)),
    [allReminders],
  );

  const overallProgress = useMemo(() => {
    const total = allFollowUpActions.length;
    const done = allFollowUpActions.filter((row) => row.action.status === "DONE").length;
    const percent = total === 0 ? 0 : (done / total) * 100;
    return { total, done, percent: clamp(percent) };
  }, [allFollowUpActions]);

  const soonestDue = useMemo(() => {
    const dueItems = allFollowUpActions
      .map((row) => row.action)
      .filter((action) => action.status !== "DONE" && action.due_at)
      .sort((a, b) => parseISO(a.due_at as string).getTime() - parseISO(b.due_at as string).getTime());
    return dueItems[0]?.due_at ?? null;
  }, [allFollowUpActions]);

  const groupedTimeline = useMemo(() => {
    const items = allFollowUpActions
      .map((row) => {
        const dueAt = row.action.due_at;
        const key = dueAt ? dueAt.slice(0, 10) : "no-due-date";
        const dueMs = dueAt ? parseISO(dueAt).getTime() : null;
        return {
          groupKey: key,
          dueMs,
          engagementSlug: row.slug,
          engagementTitle: row.title,
          action: row.action,
        };
      })
      .sort((a, b) => {
        const aKey = a.dueMs ?? Number.POSITIVE_INFINITY;
        const bKey = b.dueMs ?? Number.POSITIVE_INFINITY;
        return aKey - bKey;
      });

    const groups = new Map<string, typeof items>();
    for (const item of items) {
      const existing = groups.get(item.groupKey);
      if (existing) {
        existing.push(item);
      } else {
        groups.set(item.groupKey, [item]);
      }
    }

    return Array.from(groups.entries()).map(([groupKey, groupItems]) => ({ groupKey, items: groupItems }));
  }, [allFollowUpActions]);

  const sortedRegistrations = useMemo(() => {
    const items = [...registrations];
    if (registrationSort === "status") {
      return items.sort((a, b) => {
        const aStatus = normalizeRegistrationStatus(a.status);
        const bStatus = normalizeRegistrationStatus(b.status);
        if (aStatus !== bStatus) {
          return aStatus.localeCompare(bStatus);
        }
        return a.start_at.localeCompare(b.start_at);
      });
    }
    return items.sort((a, b) => a.start_at.localeCompare(b.start_at));
  }, [registrations, registrationSort]);

  return (
    <PageShell title="Account" subtitle="Manage your profile and registrations.">
      {problem ? (
        <div className="mt-4 space-y-3">
          <ProblemDetailsPanel problem={problem} />
          {problem.status === 401 ? (
            <EmptyState
              title="You are not logged in"
              description="Sign in to access your account details and registrations."
              action={
                <Link href="/login" className="type-label underline">
                  Go to login
                </Link>
              }
            />
          ) : null}
        </div>
      ) : null}

      {me ? (
        <Card className="mt-4 p-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="w-full" variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="registrations">My Registrations</TabsTrigger>
              <TabsTrigger value="followups">
                Follow-Ups
                {attentionCount > 0 ? (
                  <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-sm bg-state-danger px-1.5 py-0.5 text-xs font-medium text-white">
                    {attentionCount}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              {loading ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={`overview-skel-${index}`} className="p-4">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="mt-3 h-8 w-16" />
                      <Skeleton className="mt-3 h-4 w-full" />
                    </Card>
                  ))}
                </div>
              ) : (
                <StaggerContainer className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <StaggerItem>
                    <Card className="p-4">
                      <p className="type-meta text-text-muted">Upcoming events</p>
                      <p className="mt-1 text-2xl font-semibold" aria-label="Upcoming events count">
                        {upcomingRegistrations.length}
                      </p>
                      {nextRegistration ? (
                        <p className="mt-2 type-meta text-text-secondary">Next: {nextRegistration.event_title}</p>
                      ) : (
                        <p className="mt-2 type-meta text-text-muted">No upcoming events.</p>
                      )}
                    </Card>
                  </StaggerItem>

                  <StaggerItem>
                    <Card className="p-4">
                      <p className="type-meta text-text-muted">Open follow-up actions</p>
                      <p className="mt-1 text-2xl font-semibold" aria-label="Open actions count">
                        {attentionSummary?.open_actions ?? 0}
                      </p>
                      {soonestDue ? (
                        <p className="mt-2 type-meta text-text-secondary">
                          Soonest due: <RelativeTime iso={soonestDue} />
                        </p>
                      ) : (
                        <p className="mt-2 type-meta text-text-muted">No due dates yet.</p>
                      )}
                    </Card>
                  </StaggerItem>

                  <StaggerItem>
                    <Card className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="type-meta text-text-muted">Overdue items</p>
                        {(attentionSummary?.overdue_actions ?? 0) > 0 ? <Badge variant="destructive">Overdue</Badge> : null}
                      </div>
                      <p className="mt-1 text-2xl font-semibold" aria-label="Overdue items count">
                        {attentionSummary?.overdue_actions ?? 0}
                      </p>
                      <p className="mt-2 type-meta text-text-muted">Overdue follow-ups are highlighted in your timeline.</p>
                    </Card>
                  </StaggerItem>

                  <StaggerItem>
                    <Card className="p-4">
                      <p className="type-meta text-text-muted">Recent activity</p>
                      <ul className="mt-2 space-y-1">
                        {activity.slice(0, 5).map((entry) => (
                          <li key={entry.id} className="type-meta text-text-secondary">
                            {prettyActivity(entry.action)} · <RelativeTime iso={entry.created_at} />
                          </li>
                        ))}
                        {activity.length === 0 ? <li className="type-meta text-text-muted">No recent activity.</li> : null}
                      </ul>
                    </Card>
                  </StaggerItem>
                </StaggerContainer>
              )}

              {apprenticeProgress ? (
                <Card className="p-4">
                  <h3 className="type-title">Learning Path</h3>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Badge variant="default">
                      {apprenticeProgress.currentLevel?.name ?? "Apprentice"}
                    </Badge>
                    {apprenticeProgress.currentLevel?.human_edge_focus ? (
                      <span className="type-meta text-text-secondary">
                        Focus: {apprenticeProgress.currentLevel.human_edge_focus}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="type-meta text-text-muted">Gate Projects Passed</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {apprenticeProgress.submissions.filter((s) => s.status === "PASSED").length}
                        {" / "}
                        {apprenticeProgress.gateProjects.length}
                      </p>
                      <ProgressBar
                        className="mt-2"
                        value={
                          apprenticeProgress.gateProjects.length > 0
                            ? Math.round(
                                (apprenticeProgress.submissions.filter((s) => s.status === "PASSED").length /
                                  apprenticeProgress.gateProjects.length) *
                                  100,
                              )
                            : 0
                        }
                      />
                    </div>
                    <div>
                      <p className="type-meta text-text-muted">Spell Book Vocabulary</p>
                      <p className="mt-1 text-2xl font-semibold">{apprenticeProgress.vocabularyCount}</p>
                      {apprenticeProgress.currentLevel ? (
                        <p className="mt-1 type-meta text-text-muted">
                          {apprenticeProgress.currentLevel.min_vocabulary} needed for next level
                        </p>
                      ) : null}
                    </div>
                    {apprenticeProgress.nextGate ? (
                      <div>
                        <p className="type-meta text-text-muted">Next Gate</p>
                        <p className="mt-1 type-label text-text-primary">{apprenticeProgress.nextGate.title}</p>
                        {apprenticeProgress.nextGate.estimated_hours ? (
                          <p className="mt-1 type-meta text-text-muted">
                            ~{apprenticeProgress.nextGate.estimated_hours}h estimated
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {apprenticeHandle ? (
                    <div className="mt-4">
                      <Link href={`/apprentices/${apprenticeHandle}`} className="type-label underline">
                        View public profile
                      </Link>
                    </div>
                  ) : null}
                </Card>
              ) : null}

              <Card className="p-4">
                <h3 className="type-title">Stripe payouts</h3>
                <p className="mt-1 type-meta text-text-muted">Connect Stripe so we can pay out approved ledger entries.</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={stripeConnect?.status === "COMPLETE" ? "default" : "secondary"}>
                    {stripeConnect?.status ?? "NOT_STARTED"}
                  </Badge>
                  {stripeConnect?.last_checked_at ? (
                    <span className="type-meta text-text-muted">Checked: {formatDateTime(stripeConnect.last_checked_at)}</span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    intent="primary"
                    disabled={connectingStripe || stripeConnect?.status === "COMPLETE"}
                    onClick={async () => {
                      setConnectingStripe(true);
                      setProblem(null);

                      const result = await requestHal<{ onboarding_url: string }>("/api/v1/account/stripe-connect", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({}),
                      });

                      if (!result.ok) {
                        setProblem(result.problem);
                        toast.error("Unable to start Stripe onboarding.");
                        setConnectingStripe(false);
                        return;
                      }

                      window.open(result.data.onboarding_url, "_blank", "noopener,noreferrer");
                      toast.success("Stripe onboarding opened in a new tab.");

                      const refreshed = await requestHal<StripeConnectStatusResponse>("/api/v1/account/stripe-connect");
                      if (refreshed.ok) {
                        setStripeConnect(refreshed.data);
                      }

                      setConnectingStripe(false);
                    }}
                  >
                    {stripeConnect?.status === "COMPLETE" ? "Connected" : connectingStripe ? "Opening…" : "Connect Stripe"}
                  </Button>

                  <Button
                    intent="secondary"
                    disabled={connectingStripe}
                    onClick={async () => {
                      const refreshed = await requestHal<StripeConnectStatusResponse>("/api/v1/account/stripe-connect");
                      if (refreshed.ok) {
                        setStripeConnect(refreshed.data);
                      }
                    }}
                  >
                    Refresh status
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="type-title">Profile</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input id="profile-email" value={me.email} disabled aria-readonly />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-status">Status</Label>
                    <Input id="profile-status" value={me.status} disabled aria-readonly />
                  </div>
                </div>
                <p className="mt-3 type-meta text-text-secondary">
                  Last login: {me.last_login_at ? <RelativeTime iso={me.last_login_at} /> : "—"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    intent="secondary"
                    onClick={async () => {
                      const result = await requestHal<{ accepted: boolean }>("/api/v1/auth/password-reset/request", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ email: me.email }),
                      });
                      if (!result.ok) {
                        setProblem(result.problem);
                        toast.error("Unable to request password reset.");
                        return;
                      }
                      toast.success("Password reset requested.");
                    }}
                  >
                    Reset password
                  </Button>
                  <Link href="/terms" className="type-label underline">
                    Terms
                  </Link>
                  <Link href="/privacy" className="type-label underline">
                    Privacy
                  </Link>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="registrations" className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="type-title">My registrations ({registrations.length})</h2>
                <div className="flex items-center gap-2">
                  <Label htmlFor="registration-sort">Sort</Label>
                  <Select value={registrationSort} onValueChange={(value) => setRegistrationSort(value as typeof registrationSort)}>
                    <SelectTrigger id="registration-sort" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">By date</SelectItem>
                      <SelectItem value="status">By status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {registrations.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="No registrations yet"
                    description="Browse upcoming events and register when you're ready."
                    action={
                      <Link href="/events" className="type-label underline">
                        Browse upcoming events
                      </Link>
                    }
                  />
                </div>
              ) : null}

              <ul className="mt-4 space-y-2">
                {sortedRegistrations.map((registration) => (
                  <li key={registration.registration_id} className="surface rounded-sm p-2">
                    {(() => {
                      const cancelHref = registration._links?.["app:cancel"]?.href;
                      const isPast = (() => {
                        try {
                          return parseISO(registration.end_at).getTime() < nowMs;
                        } catch {
                          return false;
                        }
                      })();

                      return (
                        <div className={`flex items-start justify-between gap-3 ${isPast ? "opacity-70" : ""}`}>
                          <div>
                            <p className="type-label text-text-primary">{registration.event_title}</p>
                            <p className="type-meta text-text-muted">{registration.event_slug}</p>
                            <p className="type-meta text-text-muted">
                              {formatEventPrimaryRange({
                                startIso: registration.start_at,
                                endIso: registration.end_at,
                                timezone: registration.timezone,
                              })}
                            </p>
                            <p className="type-meta text-text-muted">
                              <RelativeTime iso={registration.start_at} />
                            </p>
                            <p className="type-meta text-text-muted">
                              {formatTimeZoneLabel({ isoString: registration.start_at, timezone: registration.timezone })}
                            </p>
                            <p className="type-meta text-text-muted">
                              Engagement: {registration.engagement_type} · Mode: {registration.delivery_mode}
                              {registration.how_to_attend ? ` · ${registration.how_to_attend}` : ""}
                            </p>
                            <p className="type-meta text-text-muted">
                              Instructor: {registration.instructor_name ? registration.instructor_name : "TBA"} ({registration.instructor_state})
                            </p>
                            <p className="mt-1 type-meta text-text-secondary">
                              <span className={`rounded-sm px-2 py-1 ${statusChipClass(normalizeRegistrationStatus(registration.status))}`}>
                                {normalizeRegistrationStatus(registration.status)}
                              </span>
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Link href={registration._links?.event?.href ?? `/events/${registration.event_slug}`} className="type-label underline">
                              View event
                            </Link>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                intent="secondary"
                                onClick={() => {
                                  const detailsUrl = `${window.location.origin}/events/${registration.event_slug}`;
                                  const location = [registration.location_text, registration.meeting_url]
                                    .filter((value): value is string => Boolean(value && value.trim().length > 0))
                                    .join(" · ");
                                  const url = buildGoogleCalendarUrl({
                                    title: registration.event_title,
                                    startIso: registration.start_at,
                                    endIso: registration.end_at,
                                    location,
                                    detailsUrl,
                                  });
                                  window.open(url, "_blank", "noopener,noreferrer");
                                }}
                              >
                                Google Calendar
                              </Button>
                              <Button
                                intent="secondary"
                                onClick={() => {
                                  window.open(`/api/v1/events/${registration.event_slug}/ics`, "_blank", "noopener,noreferrer");
                                }}
                              >
                                Download .ics
                              </Button>
                            </div>
                            {cancelHref ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button intent="secondary" disabled={cancelingId === registration.registration_id}>
                                    {cancelingId === registration.registration_id ? "Working..." : "Cancel registration"}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel registration?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      You’ll lose your spot for {registration.event_title}. You can undo for 8 seconds.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={cancelingId === registration.registration_id}>Keep</AlertDialogCancel>
                                    <AlertDialogAction
                                      disabled={cancelingId === registration.registration_id}
                                      onClick={async () => {
                                        setCancelingId(registration.registration_id);
                                        setProblem(null);

                                        const undoKey = `registration-cancel:${registration.registration_id}`;
                                        const snapshot = registration;
                                        const snapshotEngagement =
                                          engagements.find((item) => item.registration_id === registration.registration_id) ?? null;

                                        if (!undoEnabled) {
                                          const result = await requestHal<{ status: string }>(cancelHref, { method: "DELETE" });
                                          if (!result.ok) {
                                            setProblem(result.problem);
                                            setCancelingId(null);
                                            toast.error("Unable to cancel registration.");
                                            return;
                                          }

                                          await refreshRegistrations();
                                          await refreshAttention();
                                          toast.success("Registration cancelled.");
                                          setCancelingId(null);
                                          return;
                                        }

                                        startUndoableCommit({
                                          key: undoKey,
                                          toastTitle: "Registration cancelled.",
                                          toastDetail: "Undo available for 8 seconds.",
                                          optimistic: () => {
                                            setRegistrations((current) =>
                                              current.filter((item) => item.registration_id !== snapshot.registration_id),
                                            );
                                            if (snapshotEngagement) {
                                              setEngagements((current) =>
                                                current.filter((item) => item.registration_id !== snapshotEngagement.registration_id),
                                              );
                                            }
                                          },
                                          rollback: () => {
                                            setRegistrations((current) => {
                                              if (current.some((item) => item.registration_id === snapshot.registration_id)) return current;
                                              return [snapshot, ...current];
                                            });
                                            if (snapshotEngagement) {
                                              setEngagements((current) => {
                                                if (
                                                  current.some(
                                                    (item) => item.registration_id === snapshotEngagement.registration_id,
                                                  )
                                                ) {
                                                  return current;
                                                }
                                                return [snapshotEngagement, ...current];
                                              });
                                            }
                                          },
                                          commit: async () => {
                                            const result = await requestHal<{ status: string }>(cancelHref, { method: "DELETE" });
                                            if (!result.ok) {
                                              return { ok: false as const, problem: result.problem };
                                            }
                                            return { ok: true as const };
                                          },
                                          onCommitted: async () => {
                                            await refreshRegistrations();
                                            await refreshAttention();
                                          },
                                          commitErrorToast: "Unable to cancel registration.",
                                          undoToast: "Registration restored.",
                                        });

                                        setCancelingId(null);
                                      }}
                                    >
                                      Confirm cancel
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : null}
                          </div>
                        </div>
                      );
                    })()}
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="followups" className="mt-4">
              <h2 className="type-title">Follow-ups</h2>
              <p className="mt-1 type-body-sm text-text-secondary">Track action items and reminders across your engagements.</p>

              {engagements.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="All caught up! 🎉" description="You don’t have any follow-ups yet." />
                </div>
              ) : null}

              {engagements.length > 0 ? (
                <Card className="mt-4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="type-meta text-text-muted">Overall completion</p>
                      <p className="mt-1 type-body-sm text-text-secondary">
                        {overallProgress.done} of {overallProgress.total} actions done
                      </p>
                    </div>
                    <div className="w-48">
                      <ProgressBar
                        value={overallProgress.percent}
                        tone={(attentionSummary?.overdue_actions ?? 0) > 0 ? "destructive" : pendingReminderRows.length > 0 ? "warning" : "success"}
                        label="Overall follow-up completion"
                      />
                    </div>
                  </div>
                </Card>
              ) : null}

              {loadingFollowUps ? (
                <div className="mt-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={`followup-skel-${index}`} className="p-4">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="mt-3 h-4 w-5/6" />
                    </Card>
                  ))}
                </div>
              ) : null}

              {pendingReminderRows.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <h3 className="type-title">Reminders</h3>
                  {pendingReminderRows.map((row) => {
                    const action = allFollowUpActions.find((a) => a.action.id === row.reminder.action_item_id)?.action ?? null;
                    const dueAt = action?.due_at ?? null;
                    const key = `${row.slug}:${row.reminder.id}`;
                    const dueDeltaDays = dueAt ? daysBetween(nowMs, parseISO(dueAt).getTime()) : null;
                    const context =
                      dueDeltaDays === null
                        ? "You set a reminder for this action."
                        : dueDeltaDays < 0
                          ? `This action is overdue by ${Math.abs(dueDeltaDays)} days — you set a reminder.`
                          : dueDeltaDays === 0
                            ? "This action is due today — you set a reminder."
                            : `This action is due in ${dueDeltaDays} days — you set a reminder.`;

                    return (
                      <Card key={row.reminder.id} className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="type-label text-text-primary">{row.title}</p>
                            <p className="mt-1 type-body-sm text-text-secondary">{action?.description ?? "Follow-up action"}</p>
                            <p className="mt-1 type-meta text-text-muted">{context}</p>
                            <p className="mt-1 type-meta text-text-muted">Reminder for: {formatDateTime(row.reminder.reminder_for)}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              intent="secondary"
                              disabled={acknowledgingReminderKey === key}
                              onClick={async () => {
                                if (acknowledgingReminderKey) return;
                                setAcknowledgingReminderKey(key);
                                setProblem(null);

                                if (!undoEnabled) {
                                  const result = await requestHal(
                                    `/api/v1/account/engagements/${row.slug}/reminders/${row.reminder.id}`,
                                    {
                                      method: "PATCH",
                                      headers: { "content-type": "application/json" },
                                      body: JSON.stringify({ acknowledged: true }),
                                    },
                                  );

                                  if (!result.ok) {
                                    setProblem(result.problem);
                                    toast.error("Unable to dismiss reminder.");
                                    setAcknowledgingReminderKey(null);
                                    return;
                                  }

                                  setFollowUpBySlug((current) => {
                                    const found = current[row.slug];
                                    if (!found) return current;
                                    return {
                                      ...current,
                                      [row.slug]: {
                                        ...found,
                                        reminders: found.reminders.map((item) =>
                                          item.id === row.reminder.id ? { ...item, status: "ACKNOWLEDGED" } : item,
                                        ),
                                      },
                                    };
                                  });
                                  await refreshAttention();
                                  toast.success("Reminder dismissed.");
                                  setAcknowledgingReminderKey(null);
                                  return;
                                }

                                const undoKey = `reminder-ack:${row.slug}:${row.reminder.id}`;

                                startUndoableCommit({
                                  key: undoKey,
                                  toastTitle: "Reminder dismissed.",
                                  toastDetail: "Undo available for 8 seconds.",
                                  optimistic: () => {
                                    setFollowUpBySlug((current) => {
                                      const found = current[row.slug];
                                      if (!found) return current;
                                      return {
                                        ...current,
                                        [row.slug]: {
                                          ...found,
                                          reminders: found.reminders.map((item) =>
                                            item.id === row.reminder.id ? { ...item, status: "ACKNOWLEDGED" } : item,
                                          ),
                                        },
                                      };
                                    });
                                  },
                                  rollback: () => {
                                    setFollowUpBySlug((current) => {
                                      const found = current[row.slug];
                                      if (!found) return current;
                                      return {
                                        ...current,
                                        [row.slug]: {
                                          ...found,
                                          reminders: found.reminders.map((item) =>
                                            item.id === row.reminder.id ? { ...item, status: "PENDING" } : item,
                                          ),
                                        },
                                      };
                                    });
                                  },
                                  commit: async () => {
                                    const result = await requestHal(
                                      `/api/v1/account/engagements/${row.slug}/reminders/${row.reminder.id}`,
                                      {
                                        method: "PATCH",
                                        headers: { "content-type": "application/json" },
                                        body: JSON.stringify({ acknowledged: true }),
                                      },
                                    );

                                    if (!result.ok) {
                                      return { ok: false as const, problem: result.problem };
                                    }

                                    return { ok: true as const };
                                  },
                                  onCommitted: async () => {
                                    await refreshAttention();
                                  },
                                  commitErrorToast: "Unable to dismiss reminder.",
                                  undoToast: "Reminder restored.",
                                });

                                setAcknowledgingReminderKey(null);
                              }}
                            >
                              {acknowledgingReminderKey === key ? "Saving..." : "Acknowledge"}
                            </Button>
                            {[1, 3, 7].map((days) => (
                              <Button
                                key={`snooze-${days}`}
                                intent="secondary"
                                disabled={acknowledgingReminderKey === key}
                                onClick={async () => {
                                  setAcknowledgingReminderKey(key);
                                  const result = await requestHal(`/api/v1/account/engagements/${row.slug}/reminders/${row.reminder.id}`, {
                                    method: "PATCH",
                                    headers: { "content-type": "application/json" },
                                    body: JSON.stringify({ snooze_days: days }),
                                  });
                                  if (!result.ok) {
                                    setProblem(result.problem);
                                    toast.error("Unable to snooze reminder.");
                                    setAcknowledgingReminderKey(null);
                                    return;
                                  }
                                  const refreshed = await requestHal<FollowUpResponse>(
                                    `/api/v1/account/engagements/${row.slug}/follow-up`,
                                  );
                                  if (refreshed.ok) {
                                    setFollowUpBySlug((current) => ({ ...current, [row.slug]: refreshed.data }));
                                  }
                                  await refreshAttention();
                                  toast.success(`Snoozed for ${days} day${days === 1 ? "" : "s"}.`);
                                  setAcknowledgingReminderKey(null);
                                }}
                              >
                                Snooze {days}d
                              </Button>
                            ))}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : null}

              {groupedTimeline.length > 0 ? (
                <div className="mt-6 space-y-4">
                  <h3 className="type-title">Timeline</h3>
                  {groupedTimeline.map((group) => {
                    const header = group.groupKey === "no-due-date" ? "No due date" : group.groupKey;
                    return (
                      <div key={group.groupKey} className="space-y-2">
                        <div className="sticky top-0 z-10 border-b border-border bg-surface py-2">
                          <p className="type-label text-text-primary">{header}</p>
                        </div>
                        <ul className="space-y-2">
                          {group.items.map((item) => {
                            const action = item.action;
                            const key = `${item.engagementSlug}:${action.id}`;
                            const tone = dueTone({ dueAtIso: action.due_at, nowMs });
                            const dueLabel = action.due_at ? (() => {
                              const dueMs = parseISO(action.due_at).getTime();
                              const delta = daysBetween(nowMs, dueMs);
                              if (delta < 0) return `Overdue by ${Math.abs(delta)} days`;
                              if (delta === 0) return "Due today";
                              if (delta === 1) return "Due tomorrow";
                              return `Due in ${delta} days`;
                            })() : "";

                            return (
                              <li key={key} className={`surface rounded-sm p-3 ${dueAccentClass(tone)}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-60">
                                    <p className="type-label text-text-primary">{action.description}</p>
                                    <p className="mt-1 type-meta text-text-muted">
                                      {item.engagementTitle} · {timelineStatusLabel(
                                        engagements.find((e) => e.event_slug === item.engagementSlug)?.timeline_status ?? "UPCOMING",
                                      )}
                                    </p>
                                    {action.due_at ? (
                                      <p className="mt-1 type-meta text-text-secondary">
                                        {dueLabel} · <RelativeTime iso={action.due_at} />
                                      </p>
                                    ) : (
                                      <p className="mt-1 type-meta text-text-muted">No due date.</p>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <Avatar>
                                      <AvatarFallback>{"You"}</AvatarFallback>
                                    </Avatar>
                                    <Badge
                                      variant={
                                        action.status === "DONE"
                                          ? "secondary"
                                          : action.status === "BLOCKED"
                                            ? "destructive"
                                            : "outline"
                                      }
                                    >
                                      {action.status}
                                    </Badge>
                                    <Select
                                      value={action.status}
                                      onValueChange={async (nextStatus) => {
                                        const prevStatus = action.status;
                                        setFollowUpBySlug((current) => {
                                          const found = current[item.engagementSlug];
                                          if (!found) return current;
                                          return {
                                            ...current,
                                            [item.engagementSlug]: {
                                              ...found,
                                              actions: found.actions.map((a) =>
                                                a.id === action.id ? { ...a, status: nextStatus as FollowUpAction["status"] } : a,
                                              ),
                                            },
                                          };
                                        });

                                        setUpdatingActionKey(key);
                                        const result = await requestHal<{ id: string; status: string }>(
                                          `/api/v1/account/engagements/${item.engagementSlug}/actions/${action.id}`,
                                          {
                                            method: "PATCH",
                                            headers: { "content-type": "application/json" },
                                            body: JSON.stringify({ status: nextStatus }),
                                          },
                                        );

                                        if (!result.ok) {
                                          setProblem(result.problem);
                                          setFollowUpBySlug((current) => {
                                            const found = current[item.engagementSlug];
                                            if (!found) return current;
                                            return {
                                              ...current,
                                              [item.engagementSlug]: {
                                                ...found,
                                                actions: found.actions.map((a) =>
                                                  a.id === action.id ? { ...a, status: prevStatus } : a,
                                                ),
                                              },
                                            };
                                          });
                                          toast.error("Unable to update status.");
                                          setUpdatingActionKey(null);
                                          return;
                                        }

                                        await refreshAttention();
                                        toast.success("Status updated.");
                                        setUpdatingActionKey(null);
                                      }}
                                    >
                                      <SelectTrigger className="w-40" aria-label="Change status">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="OPEN">Open</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                                        <SelectItem value="DONE">Done</SelectItem>
                                        <SelectItem value="BLOCKED">Blocked</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {action.status !== "DONE" ? (
                                      <Button
                                        intent="secondary"
                                        disabled={updatingActionKey === key}
                                        onClick={async () => {
                                          if (updatingActionKey) return;
                                          setUpdatingActionKey(key);
                                          setProblem(null);

                                          const undoKey = `followup-done:${item.engagementSlug}:${action.id}`;
                                          const prevStatus = action.status;

                                          if (!undoEnabled) {
                                            setFollowUpBySlug((current) => {
                                              const found = current[item.engagementSlug];
                                              if (!found) return current;
                                              return {
                                                ...current,
                                                [item.engagementSlug]: {
                                                  ...found,
                                                  actions: found.actions.map((a) =>
                                                    a.id === action.id ? { ...a, status: "DONE" } : a,
                                                  ),
                                                },
                                              };
                                            });

                                            const result = await requestHal<{ id: string; status: string }>(
                                              `/api/v1/account/engagements/${item.engagementSlug}/actions/${action.id}`,
                                              {
                                                method: "PATCH",
                                                headers: { "content-type": "application/json" },
                                                body: JSON.stringify({ status: "DONE" }),
                                              },
                                            );

                                            if (!result.ok) {
                                              setProblem(result.problem);
                                              setFollowUpBySlug((current) => {
                                                const found = current[item.engagementSlug];
                                                if (!found) return current;
                                                return {
                                                  ...current,
                                                  [item.engagementSlug]: {
                                                    ...found,
                                                    actions: found.actions.map((a) =>
                                                      a.id === action.id ? { ...a, status: prevStatus } : a,
                                                    ),
                                                  },
                                                };
                                              });
                                              toast.error("Unable to mark done.");
                                              setUpdatingActionKey(null);
                                              return;
                                            }

                                            await refreshAttention();
                                            toast.success("Marked done.");
                                            setUpdatingActionKey(null);
                                            return;
                                          }

                                          startUndoableCommit({
                                            key: undoKey,
                                            toastTitle: "Follow-up marked done.",
                                            toastDetail: "Undo available for 8 seconds.",
                                            optimistic: () => {
                                              setFollowUpBySlug((current) => {
                                                const found = current[item.engagementSlug];
                                                if (!found) return current;
                                                return {
                                                  ...current,
                                                  [item.engagementSlug]: {
                                                    ...found,
                                                    actions: found.actions.map((a) =>
                                                      a.id === action.id ? { ...a, status: "DONE" } : a,
                                                    ),
                                                  },
                                                };
                                              });
                                            },
                                            rollback: () => {
                                              setFollowUpBySlug((current) => {
                                                const found = current[item.engagementSlug];
                                                if (!found) return current;
                                                return {
                                                  ...current,
                                                  [item.engagementSlug]: {
                                                    ...found,
                                                    actions: found.actions.map((a) =>
                                                      a.id === action.id ? { ...a, status: prevStatus } : a,
                                                    ),
                                                  },
                                                };
                                              });
                                            },
                                            commit: async () => {
                                              const result = await requestHal<{ id: string; status: string }>(
                                                `/api/v1/account/engagements/${item.engagementSlug}/actions/${action.id}`,
                                                {
                                                  method: "PATCH",
                                                  headers: { "content-type": "application/json" },
                                                  body: JSON.stringify({ status: "DONE" }),
                                                },
                                              );

                                              if (!result.ok) {
                                                return { ok: false as const, problem: result.problem };
                                              }

                                              return { ok: true as const };
                                            },
                                            onCommitted: async () => {
                                              await refreshAttention();
                                            },
                                            commitErrorToast: "Unable to mark done.",
                                            undoToast: "Marked not done.",
                                          });

                                          setUpdatingActionKey(null);
                                        }}
                                      >
                                        {updatingActionKey === key ? "Saving..." : "Mark Done"}
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {engagements.length > 0 ? (
                <div className="mt-6 space-y-2">
                  <h3 className="type-title">Engagement progress</h3>
                  <ul className="space-y-2">
                    {engagements.map((engagement) => {
                      const followUp = followUpBySlug[engagement.event_slug];
                      const actions = followUp?.actions ?? [];
                      const total = actions.length;
                      const done = actions.filter((a) => a.status === "DONE").length;
                      const percent = total === 0 ? 0 : (done / total) * 100;
                      const tone = (attentionSummary?.overdue_actions ?? 0) > 0 ? "destructive" : percent < 100 ? "warning" : "success";
                      return (
                        <li key={engagement.registration_id} className="surface rounded-sm p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="type-label text-text-primary">{engagement.event_title}</p>
                              <p className="type-meta text-text-muted">{formatAbsolute(engagement.start_at, engagement.timezone)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <ProgressRing value={percent} tone={tone} label={`Completion for ${engagement.event_title}`} />
                              <p className="type-meta text-text-secondary">
                                {done}/{total} done
                              </p>
                            </div>
                          </div>

                          {followUp ? (
                            <details className="mt-3">
                              <summary className="type-label cursor-pointer text-text-secondary">Reminder history</summary>
                              <ul className="mt-2 space-y-1">
                                {followUp.reminders.map((reminder) => (
                                  <li key={reminder.id} className="type-meta text-text-muted">
                                    {reminder.status} · {reminder.reminder_type} · {formatDateTime(reminder.reminder_for)}
                                  </li>
                                ))}
                                {followUp.reminders.length === 0 ? (
                                  <li className="type-meta text-text-muted">No reminders yet.</li>
                                ) : null}
                              </ul>
                            </details>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="feedback" className="mt-4">
              <h2 className="type-title">Feedback ({engagements.length})</h2>
              <p className="mt-1 type-body-sm text-text-secondary">Submit feedback for your completed engagements.</p>
              {engagements.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="No feedback yet" description="You’ll see feedback requests here after your events." />
                </div>
              ) : null}
              <ul className="mt-3 space-y-2">
                {engagements.map((engagement) => {
                  const draft = feedbackDrafts[engagement.event_slug] ?? { rating: 5, comment: "" };
                  return (
                    <li key={engagement.registration_id} className="surface rounded-sm p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="type-label text-text-primary">{engagement.event_title}</p>
                          <p className="type-meta text-text-muted">{engagement.event_slug}</p>
                          <p className="type-meta text-text-muted">{formatAbsolute(engagement.start_at, engagement.timezone)}</p>
                          <p className="mt-1 type-meta text-text-secondary">Feedback: {engagement.feedback_submitted ? "Submitted" : "Pending"}</p>
                        </div>

                        <div className="min-w-55 space-y-2">
                          <div className="space-y-1.5">
                            <Label htmlFor={`rating-${engagement.event_slug}`}>Rating</Label>
                            <Select
                              value={String(draft.rating)}
                              onValueChange={(value) => {
                                const rating = Number(value);
                                setFeedbackDrafts((current) => ({
                                  ...current,
                                  [engagement.event_slug]: {
                                    rating,
                                    comment: current[engagement.event_slug]?.comment ?? "",
                                  },
                                }));
                              }}
                            >
                              <SelectTrigger id={`rating-${engagement.event_slug}`} className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[5, 4, 3, 2, 1].map((value) => (
                                  <SelectItem key={value} value={String(value)}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`comment-${engagement.event_slug}`}>
                              Comment <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Input
                              id={`comment-${engagement.event_slug}`}
                              value={draft.comment}
                              onChange={(event) => {
                                const comment = event.target.value;
                                setFeedbackDrafts((current) => ({
                                  ...current,
                                  [engagement.event_slug]: {
                                    rating: current[engagement.event_slug]?.rating ?? 5,
                                    comment,
                                  },
                                }));
                              }}
                              placeholder="Share your experience"
                            />
                          </div>
                          <Button
                            intent="secondary"
                            disabled={submittingFeedbackSlug === engagement.event_slug}
                            onClick={async () => {
                              setSubmittingFeedbackSlug(engagement.event_slug);
                              setProblem(null);
                              const result = await requestHal<{ accepted: boolean }>(
                                `/api/v1/account/engagements/${engagement.event_slug}/feedback`,
                                {
                                  method: "POST",
                                  headers: {
                                    "content-type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    rating: draft.rating,
                                    comment: draft.comment,
                                  }),
                                },
                              );
                              if (!result.ok) {
                                setProblem(result.problem);
                                setSubmittingFeedbackSlug(null);
                                toast.error("Unable to submit feedback.");
                                return;
                              }

                              setEngagements((current) =>
                                current.map((item) =>
                                  item.event_slug === engagement.event_slug
                                    ? {
                                        ...item,
                                        feedback_submitted: true,
                                      }
                                    : item,
                                ),
                              );
                              toast.success("Feedback submitted.");
                              setSubmittingFeedbackSlug(null);
                            }}
                          >
                            {submittingFeedbackSlug === engagement.event_slug ? "Submitting..." : "Submit feedback"}
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </TabsContent>

            <TabsContent value="referrals" className="mt-4 space-y-3">
              <h2 className="type-title">Referral card</h2>
              <p className="mt-1 type-body-sm text-text-secondary">
                Share your link. We track clicks and consult requests so attribution is transparent.
              </p>
              <ReferralCard />
            </TabsContent>
          </Tabs>
        </Card>
      ) : null}
    </PageShell>
  );
}
