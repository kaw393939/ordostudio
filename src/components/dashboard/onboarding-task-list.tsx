"use client";

/**
 * OnboardingTaskList — Sprint 38 onboarding widget.
 *
 * Fetches task list from /api/v1/onboarding and renders interactive checklist.
 * Mounts above ActionFeed for users with incomplete tasks.
 */

import { useEffect, useState } from "react";

interface OnboardingTask {
  slug: string;
  title: string;
  description: string;
  role: string;
  position: number;
  required: boolean;
  completed: boolean;
  completed_at?: string;
}

interface OnboardingData {
  tasks: OnboardingTask[];
  all_required_complete: boolean;
}

const TASK_ACTION_LINKS: Record<string, string> = {
  "profile.complete": "/account/profile",
  "affiliate.stripe-setup": "/dashboard",
  "apprentice.intro-call": "/services/request",
};

export function OnboardingTaskList() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/v1/onboarding");
        if (res.ok) {
          const json = (await res.json()) as OnboardingData;
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleComplete(slug: string) {
    setCompleting(slug);
    try {
      const res = await fetch(`/api/v1/onboarding/complete/${slug}`, {
        method: "POST",
        headers: { origin: window.location.origin },
      });
      if (res.ok) {
        // Refresh task list
        const refreshRes = await fetch("/api/v1/onboarding");
        if (refreshRes.ok) {
          const json = (await refreshRes.json()) as OnboardingData;
          setData(json);
        }
      }
    } finally {
      setCompleting(null);
    }
  }

  if (loading || !data) return null;
  if (data.tasks.length === 0 || data.all_required_complete) return null;

  const nextIncomplete = data.tasks.find((t) => t.required && !t.completed);

  return (
    <div
      className="border border-brand rounded p-4 bg-bg-surface mb-4"
      aria-label="Onboarding checklist"
    >
      <h2 className="type-title text-text-primary mb-1">Getting started</h2>
      <p className="type-body-sm text-text-secondary mb-4">
        Complete these steps to activate your account.
      </p>

      <ol className="flex flex-col gap-3">
        {data.tasks.map((task) => {
          const actionHref = TASK_ACTION_LINKS[task.slug];
          const isNext = task.slug === nextIncomplete?.slug;

          return (
            <li
              key={task.slug}
              className={`flex items-start gap-3 ${task.completed ? "opacity-60" : ""}`}
            >
              <span
                className={`mt-0.5 w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                  task.completed
                    ? "bg-brand border-brand text-text-inverse"
                    : "border-border bg-bg-subtle"
                }`}
              >
                {task.completed && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4l3 3 5-6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>

              <div className="flex-1 min-w-0">
                <p
                  className={`type-label ${
                    task.completed ? "line-through text-text-muted" : "text-text-primary"
                  }`}
                >
                  {task.title}
                </p>
                <p className="type-meta text-text-secondary">{task.description}</p>
              </div>

              {!task.completed && (
                <div className="flex-shrink-0 flex gap-2 items-center">
                  {actionHref && (
                    <a
                      href={actionHref}
                      className="type-meta text-brand hover:underline whitespace-nowrap"
                    >
                      {isNext ? "Do this →" : "Open"}
                    </a>
                  )}
                  <button
                    disabled={completing === task.slug}
                    onClick={() => void handleComplete(task.slug)}
                    className="type-meta text-text-secondary hover:text-text-primary disabled:opacity-50 whitespace-nowrap"
                  >
                    Mark done
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
