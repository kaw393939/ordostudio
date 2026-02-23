import { describe, expect, it } from "vitest";
import {
  buildOfferListHref,
  isAudienceFilter,
  isDeliveryModeFilter,
  outcomesToLines,
  parseOutcomeLines,
} from "../service-catalog-ui";

describe("service catalog ui helpers", () => {
  it("validates audience and delivery filters", () => {
    expect(isAudienceFilter("INDIVIDUAL")).toBe(true);
    expect(isAudienceFilter("all")).toBe(true);
    expect(isAudienceFilter("TEAM")).toBe(false);

    expect(isDeliveryModeFilter("ONLINE")).toBe(true);
    expect(isDeliveryModeFilter("all")).toBe(true);
    expect(isDeliveryModeFilter("REMOTE")).toBe(false);
  });

  it("builds offer list href from filters", () => {
    expect(
      buildOfferListHref({
        q: "leadership",
        audience: "GROUP",
        deliveryMode: "ONLINE",
        includeInactive: true,
      }),
    ).toBe("/api/v1/offers?q=leadership&audience=GROUP&delivery_mode=ONLINE&status=all");

    expect(buildOfferListHref({ q: "", audience: "all", deliveryMode: "all" })).toBe("/api/v1/offers");
  });

  it("converts outcomes between text and array", () => {
    expect(parseOutcomeLines("a\n\n b  \n")).toEqual(["a", "b"]);
    expect(outcomesToLines(["x", "y"])).toBe("x\ny");
  });
});
