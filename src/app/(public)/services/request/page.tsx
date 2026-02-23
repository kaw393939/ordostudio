"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";
import { emitMeasurementEvent } from "@/lib/measurement-client";

type ConsultRole = "CTO" | "ENG_MANAGER" | "ENGINEER" | "OTHER";
type CompanySize = "SOLO" | "2_10" | "11_50" | "51_200" | "200_PLUS";
type PackageTier = "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | "CUSTOM";
type AIAdoption = "NONE" | "EXPERIMENTING" | "SOME_PRODUCTION" | "SCALING";

type IntakeResponse = {
  id: string;
  status: string;
  next_step: string;
};

type FieldErrors = Partial<{
  contactName: string;
  contactEmail: string;
  goals: string;
}>;

const packageLabels: Record<PackageTier, string> = {
  STARTER: "Starter — $2,000 (up to 15 participants)",
  PROFESSIONAL: "Professional — $5,000 (up to 25 participants)",
  ENTERPRISE: "Enterprise — $10,000 (up to 50 participants)",
  CUSTOM: "Custom — Let\u2019s discuss",
};

const aiAdoptionLabels: Record<AIAdoption, string> = {
  NONE: "No AI adoption yet",
  EXPERIMENTING: "Experimenting with AI tools",
  SOME_PRODUCTION: "Some AI in production",
  SCALING: "Scaling AI across the organization",
};

export default function ServiceRequestPage() {
  const searchParams = useSearchParams();
  const offerSlug = searchParams.get("offer") ?? "";

  const [role, setRole] = useState<ConsultRole>("CTO");
  const [companySize, setCompanySize] = useState<CompanySize>("2_10");
  const [packageTier, setPackageTier] = useState<PackageTier>("STARTER");
  const [aiAdoption, setAIAdoption] = useState<AIAdoption>("EXPERIMENTING");
  const [participantCount, setParticipantCount] = useState("");
  const [industry, setIndustry] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [goals, setGoals] = useState("");
  const [timeline, setTimeline] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [submitted, setSubmitted] = useState<IntakeResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [started, setStarted] = useState(false);

  const markStarted = () => {
    if (started) return;
    setStarted(true);
    void emitMeasurementEvent({
      key: "FORM_START_CONSULT_REQUEST",
      path: "/services/request",
      metadata: { offer: offerSlug || null },
    });
  };

  const derivedAudience = useMemo(() => {
    return companySize === "SOLO" ? ("INDIVIDUAL" as const) : ("ORGANIZATION" as const);
  }, [companySize]);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (contactName.trim().length === 0) {
      errors.contactName = "Contact name is required.";
    }
    if (!/^\S+@\S+\.\S+$/.test(contactEmail.trim())) {
      errors.contactEmail = "Enter a valid email address.";
    }
    if (goals.trim().length === 0) {
      errors.goals = "Goals are required.";
    }
    return errors;
  };

  const onSubmit = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    setProblem(null);
    setFieldErrors({});

    const response = await requestHal<IntakeResponse>("/api/v1/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        offer_slug: offerSlug || undefined,
        audience: derivedAudience,
        organization_name: derivedAudience === "ORGANIZATION" ? organizationName : undefined,
        contact_name: contactName,
        contact_email: contactEmail,
        goals: [
          `Role: ${role}`,
          `Company size: ${companySize}`,
          `Package: ${packageTier}`,
          `AI adoption: ${aiAdoption}`,
          participantCount ? `Participants: ${participantCount}` : "",
          industry ? `Industry: ${industry}` : "",
          goals,
        ]
          .filter((value) => value.trim().length > 0)
          .join("\n"),
        timeline: timeline.trim().length > 0 ? timeline : undefined,
      }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    void emitMeasurementEvent({
      key: "FORM_SUBMIT_CONSULT_REQUEST_SUCCESS",
      path: "/services/request",
      metadata: { offer: offerSlug || null, package: packageTier },
    });

    setSubmitted(response.data);
    setPending(false);
  };

  return (
    <PageShell title="Book a technical consult" subtitle="Tell us your context so we can recommend the right training track.">
      <Card className="p-4">
        <h2 className="type-title">Consult details</h2>
        {offerSlug ? <p className="mt-1 type-meta text-text-muted">Offer: {offerSlug}</p> : null}

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="request-role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as ConsultRole)}>
              <SelectTrigger id="request-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CTO">CTO / Founder</SelectItem>
                <SelectItem value="ENG_MANAGER">Engineering Manager</SelectItem>
                <SelectItem value="ENGINEER">Engineer / IC</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="request-company-size">Company size</Label>
            <Select value={companySize} onValueChange={(value) => setCompanySize(value as CompanySize)}>
              <SelectTrigger id="request-company-size" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SOLO">Solo</SelectItem>
                <SelectItem value="2_10">{"2\u201310"}</SelectItem>
                <SelectItem value="11_50">{"11\u201350"}</SelectItem>
                <SelectItem value="51_200">{"51\u2013200"}</SelectItem>
                <SelectItem value="200_PLUS">200+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="request-package">Package tier</Label>
            <Select value={packageTier} onValueChange={(value) => setPackageTier(value as PackageTier)}>
              <SelectTrigger id="request-package" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(packageLabels) as [PackageTier, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="request-ai-adoption">Current AI adoption</Label>
            <Select value={aiAdoption} onValueChange={(value) => setAIAdoption(value as AIAdoption)}>
              <SelectTrigger id="request-ai-adoption" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(aiAdoptionLabels) as [AIAdoption, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="request-name">Contact name</Label>
            <Input
              id="request-name"
              placeholder="e.g., Jane Doe"
              value={contactName}
              onChange={(event) => {
                setContactName(event.target.value);
                setFieldErrors((prev) => ({ ...prev, contactName: undefined }));
              }}
              onFocus={() => markStarted()}
              aria-invalid={fieldErrors.contactName ? true : undefined}
              aria-describedby={fieldErrors.contactName ? "request-name-error" : undefined}
            />
            {fieldErrors.contactName ? (
              <p id="request-name-error" className="type-meta text-state-danger">
                {fieldErrors.contactName}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="request-email">Contact email</Label>
            <Input
              id="request-email"
              type="email"
              placeholder="e.g., jane@example.com"
              value={contactEmail}
              onChange={(event) => {
                setContactEmail(event.target.value);
                setFieldErrors((prev) => ({ ...prev, contactEmail: undefined }));
              }}
              onFocus={() => markStarted()}
              aria-invalid={fieldErrors.contactEmail ? true : undefined}
              aria-describedby={fieldErrors.contactEmail ? "request-email-error" : undefined}
            />
            {fieldErrors.contactEmail ? (
              <p id="request-email-error" className="type-meta text-state-danger">
                {fieldErrors.contactEmail}
              </p>
            ) : null}
          </div>

          {derivedAudience === "ORGANIZATION" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="request-org">Organization name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="request-org"
                  placeholder="e.g., Acme Corp"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="request-industry">Industry <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="request-industry"
                  placeholder="e.g., Financial services"
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                />
              </div>
            </>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="request-participants">Number of participants <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="request-participants"
              type="number"
              placeholder="e.g., 20"
              value={participantCount}
              onChange={(event) => setParticipantCount(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor="request-goals">Goals</Label>
          <Textarea
            id="request-goals"
            value={goals}
            onChange={(event) => {
              setGoals(event.target.value);
              setFieldErrors((prev) => ({ ...prev, goals: undefined }));
            }}
            onFocus={() => markStarted()}
            className="min-h-24"
            aria-invalid={fieldErrors.goals ? true : undefined}
            aria-describedby={fieldErrors.goals ? "request-goals-error" : undefined}
          />
          {fieldErrors.goals ? (
            <p id="request-goals-error" className="type-meta text-state-danger">
              {fieldErrors.goals}
            </p>
          ) : null}
          <p className="type-meta text-text-muted">What are you trying to improve? (delivery speed, quality, standards, adoption)</p>
        </div>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor="request-timeline">Timeline <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input id="request-timeline" placeholder="e.g., this quarter" value={timeline} onChange={(event) => setTimeline(event.target.value)} />
        </div>

        <Button intent="primary" className="mt-3" onClick={() => void onSubmit()} disabled={pending}>
          {pending ? "Submitting..." : "Submit request"}
        </Button>
      </Card>

      {submitted ? (
        <Card className="mt-4 p-4">
          <h2 className="type-title">Consult request received</h2>
          <p className="mt-2 type-body-sm text-text-secondary">
            We&apos;ll review your context and reply with a recommended next step.
          </p>
          <p className="mt-1 type-body-sm text-text-secondary">Status: {submitted.status}</p>
          <p className="type-body-sm text-text-secondary">{submitted.next_step}</p>
          <p className="mt-2 type-meta text-text-muted">Reference ID: {submitted.id}</p>
        </Card>
      ) : null}

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}
    </PageShell>
  );
}
