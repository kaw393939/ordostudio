import type { EventListItemViewModel } from "@/lib/view-models/events";
import type { DiscoveryView } from "@/lib/calendar-date-ui";

export type EventSort = "date-asc" | "date-desc" | "status";
export type PublicStatusFilter = "upcoming" | "all" | "cancelled";
export type AdminStatusFilter = "all" | "DRAFT" | "PUBLISHED" | "CANCELLED";

export type EventListState<TStatus extends string> = {
  q: string;
  status: TStatus;
  sort: EventSort;
  page: number;
  view: DiscoveryView;
};

export const DEFAULT_PUBLIC_LIST_STATE: EventListState<PublicStatusFilter> = {
  q: "",
  status: "upcoming",
  sort: "date-asc",
  page: 1,
  view: "list",
};

export const DEFAULT_ADMIN_LIST_STATE: EventListState<AdminStatusFilter> = {
  q: "",
  status: "all",
  sort: "date-asc",
  page: 1,
  view: "list",
};

const toPositivePage = (value: string | null, fallback: number) => {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
};

const isEventSort = (value: string | null): value is EventSort => {
  return value === "date-asc" || value === "date-desc" || value === "status";
};

const isDiscoveryView = (value: string | null): value is DiscoveryView => {
  return value === "list" || value === "month" || value === "agenda";
};

export function parseListState<TStatus extends string>(
  search: string,
  defaults: EventListState<TStatus>,
  isStatus: (value: string | null) => value is TStatus,
): EventListState<TStatus> {
  const params = new URLSearchParams(search);
  const sortParam = params.get("sort");
  const statusParam = params.get("status");
  const viewParam = params.get("view");
  const sort: EventSort = isEventSort(sortParam) ? sortParam : defaults.sort;
  const status: TStatus = isStatus(statusParam) ? statusParam : defaults.status;
  const view: DiscoveryView = isDiscoveryView(viewParam) ? viewParam : defaults.view;

  return {
    q: params.get("q") ?? defaults.q,
    status,
    sort,
    page: toPositivePage(params.get("page"), defaults.page),
    view,
  };
}

export function buildListSearchParams<TStatus extends string>(
  state: EventListState<TStatus>,
  defaults: EventListState<TStatus>,
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.q.trim().length > 0) {
    params.set("q", state.q.trim());
  }

  if (state.status !== defaults.status) {
    params.set("status", state.status);
  }

  if (state.sort !== defaults.sort) {
    params.set("sort", state.sort);
  }

  if (state.page !== defaults.page) {
    params.set("page", String(state.page));
  }

  if (state.view !== defaults.view) {
    params.set("view", state.view);
  }

  return params;
}

export function publicStatusToApiStatus(status: PublicStatusFilter): string | undefined {
  if (status === "upcoming") {
    return "PUBLISHED";
  }

  if (status === "cancelled") {
    return "CANCELLED";
  }

  return undefined;
}

export function adminStatusToApiStatus(status: AdminStatusFilter): string | undefined {
  if (status === "all") {
    return undefined;
  }
  return status;
}

const byDateAsc = (items: EventListItemViewModel[]) =>
  [...items].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

const byDateDesc = (items: EventListItemViewModel[]) =>
  [...items].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

const byStatus = (items: EventListItemViewModel[]) =>
  [...items].sort((a, b) => {
    const statusOrder: Record<string, number> = {
      PUBLISHED: 0,
      DRAFT: 1,
      CANCELLED: 2,
    };
    const aRank = statusOrder[a.status] ?? 99;
    const bRank = statusOrder[b.status] ?? 99;
    if (aRank !== bRank) {
      return aRank - bRank;
    }
    return a.title.localeCompare(b.title);
  });

export function sortEvents(items: EventListItemViewModel[], sort: EventSort): EventListItemViewModel[] {
  if (sort === "date-desc") {
    return byDateDesc(items);
  }

  if (sort === "status") {
    return byStatus(items);
  }

  return byDateAsc(items);
}

export const isPublicStatusFilter = (value: string | null): value is PublicStatusFilter =>
  value === "upcoming" || value === "all" || value === "cancelled";

export const isAdminStatusFilter = (value: string | null): value is AdminStatusFilter =>
  value === "all" || value === "DRAFT" || value === "PUBLISHED" || value === "CANCELLED";
