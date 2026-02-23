"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import type { SubmitState } from "./use-submit-state";

type SubmitButtonProps = Omit<React.ComponentProps<typeof Button>, "type"> & {
  state: SubmitState;
};

/**
 * Submit button with built-in state feedback:
 * - idle: shows children text, enabled
 * - submitting: shows "Saving…" + spinner, disabled
 * - success: shows "Saved!" briefly
 * - error: shows children text, enabled (retry)
 */
export function SubmitButton({
  state,
  children,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const isSubmitting = state === "submitting";
  const isSuccess = state === "success";

  return (
    <Button
      type="submit"
      disabled={disabled || isSubmitting}
      className={cn(className)}
      {...props}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Saving…
        </>
      ) : isSuccess ? (
        "Saved!"
      ) : (
        children
      )}
    </Button>
  );
}
