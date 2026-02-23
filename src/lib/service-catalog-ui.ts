export type AudienceFilter = "all" | "INDIVIDUAL" | "GROUP";
export type DeliveryModeFilter = "all" | "ONLINE" | "IN_PERSON";

export const isAudienceFilter = (value: string): value is AudienceFilter =>
  value === "all" || value === "INDIVIDUAL" || value === "GROUP";

export const isDeliveryModeFilter = (value: string): value is DeliveryModeFilter =>
  value === "all" || value === "ONLINE" || value === "IN_PERSON";

export const parseOutcomeLines = (input: string): string[] =>
  input
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const outcomesToLines = (items: string[]): string => items.join("\n");

export const buildOfferListHref = (filters: {
  q?: string;
  audience: AudienceFilter;
  deliveryMode: DeliveryModeFilter;
  includeInactive?: boolean;
}) => {
  const query = new URLSearchParams();

  if (filters.q && filters.q.trim().length > 0) {
    query.set("q", filters.q.trim());
  }

  if (filters.audience !== "all") {
    query.set("audience", filters.audience);
  }

  if (filters.deliveryMode !== "all") {
    query.set("delivery_mode", filters.deliveryMode);
  }

  if (filters.includeInactive) {
    query.set("status", "all");
  }

  const queryString = query.toString();
  return queryString.length > 0 ? `/api/v1/offers?${queryString}` : "/api/v1/offers";
};
