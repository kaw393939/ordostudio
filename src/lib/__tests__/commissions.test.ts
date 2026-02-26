/**
 * FIN-02: Commission rate constants and invariant
 */
import { describe, it, expect } from "vitest";
import {
  AFFILIATE_COMMISSION_RATE,
  PROVIDER_PAYOUT_RATE,
} from "@/lib/constants/commissions";

describe("Commission rate constants (FIN-02)", () => {
  it("AFFILIATE_COMMISSION_RATE is 0.20", () => {
    expect(AFFILIATE_COMMISSION_RATE).toBe(0.20);
  });

  it("PROVIDER_PAYOUT_RATE is 0.60", () => {
    expect(PROVIDER_PAYOUT_RATE).toBe(0.60);
  });

  it("total payout rate does not exceed 1.0 (platform always receives a cut)", () => {
    expect(PROVIDER_PAYOUT_RATE + AFFILIATE_COMMISSION_RATE).toBeLessThanOrEqual(1.0);
  });

  it("platform revenue rate is positive", () => {
    const platformRate = 1.0 - PROVIDER_PAYOUT_RATE - AFFILIATE_COMMISSION_RATE;
    expect(platformRate).toBeGreaterThan(0);
  });
});
