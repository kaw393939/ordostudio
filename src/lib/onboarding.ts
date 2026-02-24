/**
 * Onboarding progress model.
 *
 * Tracks per-user onboarding step completion. Steps are role-dependent:
 * new users get profile steps, intake-completing users get client steps.
 */

export type OnboardingStepId =
  | "verify_email"
  | "complete_profile"
  | "explore_events"
  | "submit_intake"
  | "sign_agreement";

export type OnboardingStep = {
  id: OnboardingStepId;
  label: string;
  description: string;
  href: string;
  completed: boolean;
  completedAt?: string;
};

export type OnboardingProgress = {
  userId: string;
  complete: boolean;
  completedSteps: number;
  totalSteps: number;
  steps: OnboardingStep[];
};

/** Default onboarding steps for a new user */
const NEW_USER_STEPS: Omit<OnboardingStep, "completed" | "completedAt">[] = [
  {
    id: "verify_email",
    label: "Verify your email",
    description: "Check your inbox and click the verification link.",
    href: "/account",
  },
  {
    id: "complete_profile",
    label: "Complete your profile",
    description: "Add your display name and bio.",
    href: "/account",
  },
  {
    id: "explore_events",
    label: "Browse upcoming events",
    description: "Discover workshops and training sessions.",
    href: "/events",
  },
];

/** Additional onboarding steps for a prospective client */
const CLIENT_STEPS: Omit<OnboardingStep, "completed" | "completedAt">[] = [
  {
    id: "submit_intake",
    label: "Submit a client intake form",
    description: "Tell us about your team and goals.",
    href: "/services/request",
  },
  {
    id: "sign_agreement",
    label: "Sign the engagement agreement",
    description: "Review and sign the service agreement.",
    href: "/dashboard",
  },
];

export type OnboardingCompletions = Partial<Record<OnboardingStepId, string>>;

/**
 * Build the onboarding progress view model from completed step IDs.
 */
export function buildOnboardingProgress(
  userId: string,
  completions: OnboardingCompletions,
  includeClientSteps: boolean,
): OnboardingProgress {
  const stepTemplates = includeClientSteps
    ? [...NEW_USER_STEPS, ...CLIENT_STEPS]
    : NEW_USER_STEPS;

  const steps: OnboardingStep[] = stepTemplates.map((template) => ({
    ...template,
    completed: template.id in completions,
    completedAt: completions[template.id],
  }));

  const completedSteps = steps.filter((s) => s.completed).length;

  return {
    userId,
    complete: completedSteps === steps.length,
    completedSteps,
    totalSteps: steps.length,
    steps,
  };
}

/**
 * Determine if onboarding is required (first-time users who haven't
 * completed all required steps).
 */
export function shouldShowOnboarding(progress: OnboardingProgress): boolean {
  return !progress.complete;
}

/**
 * Check if completing onboarding should trigger CLIENT role provisioning.
 * Returns true when the user has completed submit_intake AND sign_agreement.
 */
export function shouldProvisionClientRole(progress: OnboardingProgress): boolean {
  const intakeComplete = progress.steps.find((s) => s.id === "submit_intake")?.completed ?? false;
  const agreementComplete = progress.steps.find((s) => s.id === "sign_agreement")?.completed ?? false;
  return intakeComplete && agreementComplete;
}
