"use client";

import { useCallback, useRef, useState } from "react";

export type SubmitState = "idle" | "submitting" | "success" | "error";

/**
 * State machine for form submission: idle → submitting → success | error.
 * Prevents double-submit while in the submitting state.
 */
export function useSubmitState(handler: () => Promise<void>) {
  const [state, setState] = useState<SubmitState>("idle");
  const submittingRef = useRef(false);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setState("submitting");

    try {
      await handler();
      setState("success");
    } catch {
      setState("error");
    } finally {
      submittingRef.current = false;
    }
  }, [handler]);

  const reset = useCallback(() => {
    setState("idle");
    submittingRef.current = false;
  }, []);

  return { state, handleSubmit, reset } as const;
}
