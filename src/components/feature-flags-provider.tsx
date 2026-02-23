"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getBuildTimeFeatureFlags, mergeFeatureFlags, type FeatureFlagKey, type FeatureFlags } from "@/lib/feature-flags";

type FeatureFlagsContextValue = {
  flags: FeatureFlags;
  loadedRuntime: boolean;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const baseFlags = useMemo(() => getBuildTimeFeatureFlags(), []);
  const [runtimeFlags, setRuntimeFlags] = useState<Partial<FeatureFlags> | null>(null);
  const [loadedRuntime, setLoadedRuntime] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/v1/feature-flags", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const json = (await response.json()) as unknown;
        if (cancelled) return;

        if (json && typeof json === "object" && "flags" in json) {
          const flags = (json as { flags?: Partial<FeatureFlags> }).flags;
          if (flags && typeof flags === "object") {
            setRuntimeFlags(flags);
          }
        }
      } finally {
        if (!cancelled) setLoadedRuntime(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<FeatureFlagsContextValue>(() => {
    return {
      flags: mergeFeatureFlags(baseFlags, runtimeFlags),
      loadedRuntime,
    };
  }, [baseFlags, loadedRuntime, runtimeFlags]);

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const ctx = useContext(FeatureFlagsContext);
  if (ctx) {
    return ctx.flags[key];
  }

  return getBuildTimeFeatureFlags()[key];
}
