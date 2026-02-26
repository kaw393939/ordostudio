"use client";

import { useState } from "react";
import { GuildPathCard, type GuildPathCardProps } from "./guild-path-card";
import { Button } from "@/components/primitives/button";
import { BOOKING_URL } from "@/lib/metadata";

// ─── Types ───────────────────────────────────────────────────────────────────

type Q1Value = "craft" | "projects" | "expertise" | "company";
type Q2Value = "portfolio" | "earn-grow" | "practice" | "team" | "observe";
type Q3Value = "now" | "sorting" | "planning";
type PathKey = "apprentice" | "journeyman" | "maestro" | "affiliate" | "observer";

type Answers = {
  q1: Q1Value | "";
  q2: Q2Value | "";
  q3: Q3Value | "";
};

type Step = 1 | 2 | 3 | "results";

// ─── Pure path resolution (exported for tests) ───────────────────────────────

export function resolvePaths(answers: Pick<Answers, "q1" | "q2">): PathKey[] {
  if (answers.q2 === "observe") return ["observer"];
  const paths: PathKey[] = [];
  if (answers.q1 === "craft") paths.push("apprentice");
  if (answers.q1 === "projects") paths.push("journeyman", "apprentice");
  if (answers.q1 === "expertise") paths.push("maestro", "journeyman");
  if (answers.q1 === "company") paths.push("affiliate");
  paths.push("observer");
  return paths;
}

// ─── Question config ──────────────────────────────────────────────────────────

const Q1_OPTIONS: Array<{ value: Q1Value; label: string }> = [
  { value: "craft", label: "I'm learning my craft — early career or changing tracks" },
  { value: "projects", label: "I have real projects behind me and want to go deeper" },
  { value: "expertise", label: "I have deep expertise and want to teach and direct" },
  { value: "company", label: "I represent a company or team" },
];

const Q2_OPTIONS: Array<{ value: Q2Value; label: string }> = [
  { value: "portfolio", label: "Build a portfolio of shipped work and advance my career" },
  { value: "earn-grow", label: "Earn while I grow by contributing to real projects" },
  { value: "practice", label: "Build a practice with my expertise in the AI era" },
  { value: "team", label: "Train my team with mentored, project-based work" },
  { value: "observe", label: "I want to follow the work before I decide anything" },
];

const Q3_OPTIONS: Array<{ value: Q3Value; label: string }> = [
  { value: "now", label: "Ready now — I want to start within the month" },
  { value: "sorting", label: "Getting sorted — 1 to 3 months out" },
  { value: "planning", label: "Planning ahead — 3 to 6 months out" },
];

const PROGRESS_DOTS = ["●──○──○", "●──●──○", "●──●──●"] as const;

// ─── Card data builder ────────────────────────────────────────────────────────

function buildCardData(answers: Answers): Record<PathKey, GuildPathCardProps> {
  const maestroUrgency =
    answers.q3 === "now"
      ? "Cohort forming now — limited by maestro capacity."
      : "Cohort-based · Limited by maestro capacity.";

  return {
    apprentice: {
      title: "The Studio Apprenticeship",
      badge: "Apprentice",
      description:
        "A 12–18 month guided progression through eight gate projects. You ship real work, build a portfolio, and finish holding artifacts that prove your capability — not a certificate.",
      bullets: [
        "Mentored directly by the Maestro and Journeyman",
        "Every project is production-grade, not a drill",
        "Context Pack + Field Notes included from day one",
      ],
      pathKey: "apprentice",
      ctaHref: `${BOOKING_URL}?path=apprentice`,
      authorityLine: "23 years · 10,000+ engineers trained.",
    },
    journeyman: {
      title: "The Journeyman Track",
      badge: "Journeyman",
      description:
        "You've shipped real work. The Journeyman track takes you deeper: advanced gate projects, peer mentoring, and the path toward directing your own practice.",
      bullets: [
        "Advanced gate projects, Maestro-reviewed",
        "Peer-mentoring responsibilities and stipend",
        "Documented progression toward Maestro candidacy",
      ],
      pathKey: "journeyman",
      ctaHref: `${BOOKING_URL}?path=journeyman`,
    },
    maestro: {
      title: "The Maestro Accelerator",
      badge: "Maestro Accelerator",
      description:
        "You have deep expertise. The AI era doesn't make it obsolete — it makes it more valuable, if you know how to apply it. The Accelerator gives you the operating model: Context Pack, guild structure, franchise system.",
      bullets: [
        "8-week cohort program — structured, not open-ended",
        "Your expertise, re-oriented for agentic workflows",
        "Revenue share from the first engagement",
      ],
      pathKey: "maestro",
      ctaHref: `${BOOKING_URL}?path=maestro`,
      urgencyNote: maestroUrgency,
    },
    affiliate: {
      title: "Corporate Affiliate",
      badge: "Affiliate",
      description:
        "Your team ships real work every day. The Affiliate track brings a Maestro into your workflow to run mentored project cycles — scoped to your stack, on your timeline.",
      bullets: [
        "Custom engagement scoped to your stack and team",
        "Dedicated Maestro assignment, not a vendor relationship",
        "Co-branded materials; your identity stays primary",
      ],
      pathKey: "affiliate",
      ctaHref: `${BOOKING_URL}?path=affiliate`,
    },
    observer: {
      title: "Follow the Work",
      badge: "Observer",
      description:
        "Not ready to decide. Subscribe to the newsletter and follow the studio's public work: field notes, case studies, and open sessions. No commitment.",
      bullets: [
        "Free — no credit card, no expiry",
        "Field notes and case studies from active projects",
        "Invitation to open sessions (EverydayAI, Town Halls)",
      ],
      pathKey: "observer",
      ctaHref: "/newsletter",
      ctaLabel: "Follow the Work →",
      urgencyNote: "Join when you're ready. Or don't.",
    },
  };
}

// ─── Question step renderer ───────────────────────────────────────────────────

type QuestionStepProps = {
  stepNum: 1 | 2 | 3;
  options: Array<{ value: string; label: string }>;
  question: string;
  qKey: keyof Answers;
  currentValue: string;
  onSelect: (val: string) => void;
  onBack: () => void;
  onNext: () => void;
};

function QuestionStep({
  stepNum,
  options,
  question,
  qKey,
  currentValue,
  onSelect,
  onBack,
  onNext,
}: QuestionStepProps) {
  const isLast = stepNum === 3;
  const btnLabel = isLast ? "See My Paths →" : "Continue →";

  return (
    <div className="surface p-6 rounded-lg border border-border-subtle max-w-xl">
      <p className="type-meta text-text-muted mb-4" aria-label={`Step ${stepNum} of 3`}>
        {PROGRESS_DOTS[stepNum - 1]}&nbsp;&nbsp;Step {stepNum} of 3
      </p>
      <p className="type-title text-text-primary mb-4">{question}</p>
      <div className="space-y-3">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name={qKey}
              value={opt.value}
              checked={currentValue === opt.value}
              onChange={() => onSelect(opt.value)}
              className="mt-0.5 shrink-0"
            />
            <span className="type-body-sm text-text-secondary">{opt.label}</span>
          </label>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-4">
        {stepNum > 1 ? (
          <button
            onClick={onBack}
            className="type-label text-text-secondary hover:text-text-primary transition-colors"
          >
            ← Back
          </button>
        ) : null}
        <Button intent="primary" disabled={!currentValue} onClick={onNext}>
          {btnLabel}
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GuildJoinFlow() {
  const [step, setStep] = useState<Step>(1);
  const [answers, setAnswers] = useState<Answers>({ q1: "", q2: "", q3: "" });

  const setAnswer = (qKey: keyof Answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [qKey]: value }));
  };

  const handleNext = (currentStep: 1 | 2 | 3) => {
    if (currentStep === 3) {
      setStep("results");
    } else {
      setStep((currentStep + 1) as Step);
    }
  };

  if (step === "results") {
    const paths = resolvePaths(answers);
    const cardData = buildCardData(answers);

    return (
      <div>
        <p className="type-title text-text-primary">Here&apos;s what we&apos;d suggest.</p>
        <p className="mt-1 type-body-sm text-text-secondary">
          Based on your answers — not a sales pitch.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {paths.map((key) => (
            <GuildPathCard key={key} {...cardData[key]} />
          ))}
        </div>
        <button
          onClick={() => {
            setStep(1);
            setAnswers({ q1: "", q2: "", q3: "" });
          }}
          className="mt-6 type-meta text-text-muted hover:text-text-primary underline transition-colors"
        >
          ← Start over
        </button>
      </div>
    );
  }

  const stepConfig: Record<
    1 | 2 | 3,
    { question: string; options: Array<{ value: string; label: string }>; qKey: keyof Answers }
  > = {
    1: { question: "What describes your situation right now?", options: Q1_OPTIONS, qKey: "q1" },
    2: { question: "What outcome matters most to you?", options: Q2_OPTIONS, qKey: "q2" },
    3: { question: "Where are you in your timeline?", options: Q3_OPTIONS, qKey: "q3" },
  };

  const { question, options, qKey } = stepConfig[step as 1 | 2 | 3];

  return (
    <QuestionStep
      stepNum={step as 1 | 2 | 3}
      question={question}
      options={options}
      qKey={qKey}
      currentValue={answers[qKey]}
      onSelect={(val) => setAnswer(qKey, val)}
      onBack={() => setStep((step as number) - 1 as Step)}
      onNext={() => handleNext(step as 1 | 2 | 3)}
    />
  );
}
