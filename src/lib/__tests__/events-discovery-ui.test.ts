import { describe, expect, it } from "vitest";
import {
  adminStatusToApiStatus,
  buildListSearchParams,
  DEFAULT_ADMIN_LIST_STATE,
  DEFAULT_PUBLIC_LIST_STATE,
  parseListState,
  publicStatusToApiStatus,
  sortEvents,
  type EventListState,
  type PublicStatusFilter,
  type AdminStatusFilter,
} from "../events-discovery-ui";
import type { EventListItemViewModel } from "../view-models/events";

describe("events discovery ui helpers", () => {
  it("parses and normalizes list state from URL", () => {
    const parsed = parseListState<PublicStatusFilter>(
      "?q=summit&status=cancelled&sort=status&page=2&view=month",
      DEFAULT_PUBLIC_LIST_STATE,
      (value): value is PublicStatusFilter => value === "upcoming" || value === "all" || value === "cancelled",
    );

    expect(parsed).toEqual({
      q: "summit",
      status: "cancelled",
      sort: "status",
      page: 2,
      view: "month",
    });
  });

  it("builds stable URL params omitting defaults", () => {
    const state: EventListState<AdminStatusFilter> = {
      q: "",
      status: "PUBLISHED",
      sort: "date-asc",
      page: 1,
      view: "agenda",
    };

    const params = buildListSearchParams(state, DEFAULT_ADMIN_LIST_STATE);
    expect(params.toString()).toBe("status=PUBLISHED&view=agenda");
  });

  it("maps status filters to API query values", () => {
    expect(publicStatusToApiStatus("upcoming")).toBe("PUBLISHED");
    expect(publicStatusToApiStatus("all")).toBeUndefined();
    expect(adminStatusToApiStatus("CANCELLED")).toBe("CANCELLED");
    expect(adminStatusToApiStatus("all")).toBeUndefined();
  });

  it("sorts event items according to selected mode", () => {
    const items: EventListItemViewModel[] = [
      {
        id: "1",
        slug: "z",
        title: "Zulu",
        status: "CANCELLED",
        statusLabel: "Cancelled",
        startAt: "2026-02-20T10:00:00.000Z",
        endAt: "2026-02-20T11:00:00.000Z",
        timezone: "UTC",
        detailHref: "/events/z",
      },
      {
        id: "2",
        slug: "a",
        title: "Alpha",
        status: "PUBLISHED",
        statusLabel: "Published",
        startAt: "2026-02-10T10:00:00.000Z",
        endAt: "2026-02-10T11:00:00.000Z",
        timezone: "UTC",
        detailHref: "/events/a",
      },
    ];

    expect(sortEvents(items, "date-asc")[0].slug).toBe("a");
    expect(sortEvents(items, "date-desc")[0].slug).toBe("z");
    expect(sortEvents(items, "status")[0].status).toBe("PUBLISHED");
  });
});
