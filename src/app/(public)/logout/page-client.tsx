"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/primitives";

export function LogoutClient() {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const attemptLogout = useMemo(
    () =>
      async (signal?: AbortSignal) => {
        setStatus("working");
        setErrorMessage("");

        try {
          const response = await fetch("/api/v1/auth/logout", {
            method: "POST",
            credentials: "include",
            headers: {
              "content-type": "application/json",
            },
            signal,
          });

          if (!response.ok) {
            setStatus("error");
            setErrorMessage(`Logout failed (${response.status}).`);
            return;
          }

          window.location.assign("/");
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          setStatus("error");
          setErrorMessage("Logout failed. Please try again.");
        }
      },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void attemptLogout(controller.signal);
    return () => controller.abort();
  }, [attemptLogout]);

  return (
    <section className="surface p-6">
      <p className="type-body-sm text-text-secondary">
        {status === "working" ? "Signing you out…" : status === "error" ? "We couldn’t sign you out." : "Ready to sign out."}
      </p>

      {status === "error" ? <p className="mt-2 type-meta text-text-muted">{errorMessage}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button intent="primary" disabled={status === "working"} onClick={() => void attemptLogout()}>
          {status === "working" ? "Logging out…" : "Logout"}
        </Button>
        <Link href="/" className="type-label underline">
          Return home
        </Link>
      </div>
    </section>
  );
}
