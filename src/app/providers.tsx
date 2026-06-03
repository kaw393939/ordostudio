"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "@/components/theme-provider";
import { FeatureFlagsProvider } from "@/components/feature-flags-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MeasurementListener } from "@/components/measurement/measurement-listener";
import { RouteAnnouncer } from "@/components/route-announcer";
import { DevUserSwitcher } from "@/components/dev/dev-user-switcher";

const IS_DEV = process.env.NEXT_PUBLIC_APPCTL_ENV === "local";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={300}>
        <NuqsAdapter>
          <FeatureFlagsProvider>
            {children}
            <RouteAnnouncer />
            <MeasurementListener />
            <Toaster />
            {IS_DEV && <DevUserSwitcher />}
          </FeatureFlagsProvider>
        </NuqsAdapter>
      </TooltipProvider>
    </ThemeProvider>
  );
}
