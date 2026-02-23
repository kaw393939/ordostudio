export type FeatureFlagKey =
  | "CALENDAR_GRID"
  | "DARK_MODE_TOGGLE"
  | "UNDO_DELETE"
  | "EXP_HOME_HERO_COPY_V2"
  | "EXP_HOME_PRIMARY_CTA_CONSULT"
  | "EXP_SERVICES_CARD_ORDER_ALT";

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

const parseFlag = (value: string | undefined): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

export const getBuildTimeFeatureFlags = (): FeatureFlags => {
  return {
    CALENDAR_GRID: parseFlag(process.env.NEXT_PUBLIC_FF_CALENDAR_GRID),
    DARK_MODE_TOGGLE: parseFlag(process.env.NEXT_PUBLIC_FF_DARK_MODE_TOGGLE),
    UNDO_DELETE: parseFlag(process.env.NEXT_PUBLIC_FF_UNDO_DELETE),
    EXP_HOME_HERO_COPY_V2: parseFlag(process.env.NEXT_PUBLIC_FF_EXP_HOME_HERO_COPY_V2),
    EXP_HOME_PRIMARY_CTA_CONSULT: parseFlag(process.env.NEXT_PUBLIC_FF_EXP_HOME_PRIMARY_CTA_CONSULT),
    EXP_SERVICES_CARD_ORDER_ALT: parseFlag(process.env.NEXT_PUBLIC_FF_EXP_SERVICES_CARD_ORDER_ALT),
  };
};

export const mergeFeatureFlags = (base: FeatureFlags, overrides: Partial<FeatureFlags> | null | undefined): FeatureFlags => {
  if (!overrides) return base;
  return {
    ...base,
    ...Object.fromEntries(
      (Object.entries(overrides) as Array<[FeatureFlagKey, boolean]>).filter(([, value]) => typeof value === "boolean"),
    ),
  } as FeatureFlags;
};
