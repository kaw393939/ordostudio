import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ApprenticeProfileNotFoundError, getPublicApprenticeByHandle } from "@/lib/api/apprentices";
import { getApprenticeProgress, type ApprenticeProgress } from "@/lib/api/apprentice-progress";

export const metadata: Metadata = {
  title: "Apprentice • Studio Ordo",
  alternates: {
    canonical: "/apprentices",
  },
};

const parseTags = (raw: string): string[] => {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 12);
};

const levelLabel = (slug: string): string => {
  const map: Record<string, string> = {
    apprentice: "Apprentice",
    journeyman: "Journeyman",
    "senior-journeyman": "Senior Journeyman",
    "maestro-candidate": "Maestro Candidate",
  };
  return map[slug] ?? slug;
};

export default async function ApprenticeProfilePage(props: { params: Promise<{ handle: string }> }) {
  const { handle } = await props.params;

  const profile = (() => {
    try {
      return getPublicApprenticeByHandle(handle);
    } catch (error) {
      if (error instanceof ApprenticeProfileNotFoundError) {
        notFound();
      }
      throw error;
    }
  })();

  const tags = parseTags(profile.tags);

  let progress: ApprenticeProgress | null = null;
  try {
    progress = getApprenticeProgress(profile.user_id);
  } catch {
    // Progress tables may not exist yet — graceful degradation
  }

  const passedGates = progress
    ? progress.submissions.filter((s) => s.status === "PASSED").length
    : 0;
  const totalGates = progress ? progress.gateProjects.length : 0;
  const gatePercent = totalGates > 0 ? Math.round((passedGates / totalGates) * 100) : 0;

  return (
    <PageShell
      title={profile.display_name}
      subtitle={profile.headline ?? "Independent consultant affiliated with Studio Ordo."}
      breadcrumbs={[{ label: "Apprentices", href: "/apprentices" }, { label: profile.display_name }]}
    >
      {progress ? (
        <Card className="p-6">
          <p className="type-meta text-text-muted">Learning Path</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge variant="default">{levelLabel(progress.currentLevel?.slug ?? "apprentice")}</Badge>
            {progress.currentLevel?.human_edge_focus ? (
              <span className="type-body-sm text-text-secondary">
                Focus: {progress.currentLevel.human_edge_focus}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="type-meta text-text-muted">Gate Projects</p>
              <p className="mt-1 type-title text-text-primary">
                {passedGates} / {totalGates}
              </p>
              <ProgressBar value={gatePercent} className="mt-2" />
            </div>
            <div>
              <p className="type-meta text-text-muted">Spell Book Terms</p>
              <p className="mt-1 type-title text-text-primary">{progress.vocabularyCount}</p>
              {progress.currentLevel ? (
                <p className="mt-1 type-meta text-text-muted">
                  {progress.currentLevel.min_vocabulary} needed for next level
                </p>
              ) : null}
            </div>
            {progress.nextGate ? (
              <div>
                <p className="type-meta text-text-muted">Next Gate</p>
                <p className="mt-1 type-label text-text-primary">{progress.nextGate.title}</p>
                {progress.nextGate.estimated_hours ? (
                  <p className="mt-1 type-meta text-text-muted">
                    ~{progress.nextGate.estimated_hours}h estimated
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className={progress ? "mt-4 p-6" : "p-6"}>
        <p className="type-meta text-text-muted">Disclosure</p>
        <p className="mt-2 type-body-sm text-text-secondary">
          This consultant is an independent contractor affiliated with Studio Ordo. Engagements sold through Studio Ordo
          use standardized offers and maestro supervision.
        </p>

        {profile.bio ? (
          <div className="mt-4">
            <p className="type-meta text-text-muted">Bio</p>
            <p className="mt-2 whitespace-pre-wrap type-body-sm text-text-secondary">{profile.bio}</p>
          </div>
        ) : null}

        {profile.location ? (
          <div className="mt-4">
            <p className="type-meta text-text-muted">Location</p>
            <p className="mt-2 type-body-sm text-text-secondary">{profile.location}</p>
          </div>
        ) : null}

        {tags.length > 0 ? (
          <div className="mt-4">
            <p className="type-meta text-text-muted">Focus</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/services/request" className="type-label underline">
            Book a consult
          </Link>
          {profile.website_url ? (
            <a className="type-label underline" href={profile.website_url} target="_blank" rel="noreferrer">
              Visit website
            </a>
          ) : null}
        </div>
      </Card>
    </PageShell>
  );
}
