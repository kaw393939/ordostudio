/**
 * Rate paid to the service provider (instructor / maestro).
 * 60% of the gross deal value.
 */
export const PROVIDER_PAYOUT_RATE = 0.60;

/**
 * The commission rate paid to affiliates/referrers.
 * 20% of the gross deal value.
 */
export const AFFILIATE_COMMISSION_RATE = 0.20;

/**
 * Import-time assertion: provider + affiliate must not exceed 100%.
 * If anyone edits the rates so they sum > 1.0, they get an immediate error
 * at module load instead of silent negative platform revenue at runtime.
 */
const _totalPayoutRate = PROVIDER_PAYOUT_RATE + AFFILIATE_COMMISSION_RATE;
if (_totalPayoutRate > 1.0) {
  throw new Error(
    `Commission rate invariant violated: PROVIDER_PAYOUT_RATE (${PROVIDER_PAYOUT_RATE}) + ` +
      `AFFILIATE_COMMISSION_RATE (${AFFILIATE_COMMISSION_RATE}) = ${_totalPayoutRate} > 1.0`,
  );
}
