#!/usr/bin/env python3
"""Write implementation files for Sprint 45."""
import os

BASE = os.path.dirname(os.path.abspath(__file__))

def write(relpath, content):
    path = os.path.join(BASE, relpath)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
    print(f"Wrote {relpath} ({os.path.getsize(path)} bytes)")

# --- motion.ts ---
write("src/lib/ui/motion.ts", '''import type { Variants } from "framer-motion";

/** Base animation duration in seconds (matches --motion-base: 180ms). */
export const MOTION_DURATION = 0.18;

const easeOut = [0.2, 0.8, 0.2, 1] as const;

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: MOTION_DURATION, ease: easeOut as unknown as number[] },
  },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION_DURATION, ease: easeOut as unknown as number[] },
  },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: MOTION_DURATION, ease: easeOut as unknown as number[] },
  },
};

export const staggerChildren: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};
''')

# --- theme-provider.tsx ---
write("src/components/theme-provider.tsx", '''"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
''')

# --- theme-toggle.tsx ---
write("src/components/theme-toggle.tsx", '''"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  const toggle = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
''')

# --- async-boundary.tsx ---
write("src/components/patterns/async-boundary.tsx", '''import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type AsyncBoundaryProps<T> = {
  isLoading: boolean;
  error: string | null;
  data: T | null;
  renderData: (data: T) => ReactNode;
  onRetry?: () => void;
  loadingRows?: number;
  loadingTitle?: string;
  loadingDescription?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
};

export function AsyncBoundary<T>({
  isLoading,
  error,
  data,
  renderData,
  onRetry,
  loadingRows = 3,
  loadingTitle = "Loading",
  loadingDescription = "Please wait while we fetch the latest data.",
  emptyTitle = "No results",
  emptyDescription = "Nothing to display.",
  emptyAction,
}: AsyncBoundaryProps<T>) {
  if (isLoading) {
    return (
      <section
        className="rounded-lg border bg-card p-6"
        aria-live="polite"
        aria-busy="true"
      >
        <h2 className="text-lg font-semibold text-foreground">{loadingTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{loadingDescription}</p>
        <div className="mt-4 space-y-3">
          {Array.from({ length: Math.max(1, loadingRows) }).map((_, i) => (
            <Skeleton key={`loading-row-${i}`} className="h-4 w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="rounded-lg border bg-card p-6"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <h2 className="text-lg font-semibold text-destructive">
              Something went wrong
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
        {onRetry ? (
          <div className="mt-4">
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : null}
      </section>
    );
  }

  const isEmpty =
    data === null ||
    data === undefined ||
    (Array.isArray(data) && data.length === 0);

  if (isEmpty) {
    return (
      <section
        className="rounded-lg border bg-card p-6 text-center"
        aria-live="polite"
      >
        <h2 className="text-lg font-semibold text-foreground">{emptyTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
        {emptyAction ? <div className="mt-4">{emptyAction}</div> : null}
      </section>
    );
  }

  return <>{renderData(data)}</>;
}
''')

# --- motion-wrapper.tsx ---
write("src/components/ui/motion-wrapper.tsx", '''"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeIn, slideUp, staggerChildren } from "@/lib/ui/motion";

type MotionWrapperProps = {
  children: ReactNode;
  className?: string;
};

export function FadeIn({ children, className }: MotionWrapperProps) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      variants={fadeIn}
      initial={shouldReduce ? false : "initial"}
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideUp({ children, className }: MotionWrapperProps) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      variants={slideUp}
      initial={shouldReduce ? false : "initial"}
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, className }: MotionWrapperProps) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      variants={staggerChildren}
      initial={shouldReduce ? false : "initial"}
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: MotionWrapperProps) {
  return (
    <motion.div variants={slideUp} className={className}>
      {children}
    </motion.div>
  );
}
''')

print("All files written successfully!")
